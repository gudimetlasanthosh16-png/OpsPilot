import os
import json
import operator
import sqlite3
from typing import Dict, Any, List
from dotenv import load_dotenv

load_dotenv()
from openai import OpenAI, RateLimitError
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver
from opspilot.tool_registry import registry
from opspilot.schemas import AgentState

class OpsPilotAgent:
    def __init__(self, api_key: str = None, base_url: str = None, model: str = None):
        # Allow multi-provider flexibility: OpenRouter, Groq, OpenAI, Gemini, or custom LLM
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        groq_key = os.getenv("GROQ_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")
        gemini_key = os.getenv("GEMINI_API_KEY")
        llm_key = os.getenv("LLM_API_KEY")
        llm_base = os.getenv("LLM_BASE_URL")

        if api_key:
            self.api_key = api_key
            self.base_url = base_url or "https://api.groq.com/openai/v1"
            self.free_models = [model or "llama-3.3-70b-versatile"]
        elif openrouter_key:
            self.api_key = openrouter_key
            self.base_url = base_url or "https://openrouter.ai/api/v1"
            self.free_models = [
                model or "google/gemma-4-26b-a4b-it:free",
                "meta-llama/llama-3.3-70b-instruct:free",
                "mistralai/mistral-7b-instruct:free",
                "openai/gpt-4o-mini"
            ]
        elif groq_key:
            self.api_key = groq_key
            self.base_url = base_url or "https://api.groq.com/openai/v1"
            self.free_models = [
                model or "llama-3.3-70b-versatile",
                "llama-3.1-8b-instant",
                "gemma2-9b-it"
            ]
        elif openai_key:
            self.api_key = openai_key
            self.base_url = base_url or "https://api.openai.com/v1"
            self.free_models = [model or "gpt-4o-mini", "gpt-4o"]
        elif gemini_key:
            self.api_key = gemini_key
            self.base_url = base_url or "https://generativelanguage.googleapis.com/v1beta/openai/"
            self.free_models = [model or "gemini-2.5-flash", "gemini-1.5-flash"]
        elif llm_key:
            self.api_key = llm_key
            self.base_url = llm_base or "https://api.openai.com/v1"
            self.free_models = [model or "gpt-4o-mini"]
        else:
            raise ValueError(
                "No API Key found. Please set OPENROUTER_API_KEY, GROQ_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in your .env file."
            )

        self.client = OpenAI(
            base_url=self.base_url,
            api_key=self.api_key,
        )
        self.current_model_idx = 0
        
        self.system_instruction = """You are OpsPilot, an Autonomous Incident Investigation Agent.
You will be given an incident request. Your goal is to identify the likely root cause.
You must:
1. Plan your investigation.
2. Use multiple tools to gather a complete picture. Do NOT rely only on metrics. If metrics show an issue, you MUST use `search_logs` and `get_deployments` to find the cause.
3. If you lack architectural context or need runbooks, use search_knowledge_base. If a search yields nothing, reformulate your query and try again.
4. Form a hypothesis and verify it with evidence from logs or deployments.
5. REFLECTION / CRITIC: Before issuing a final report, pause and reflect. Do I have hard evidence for this? Are there alternative hypotheses? If evidence is weak or contradictory, you MUST re-plan and execute more tools to verify.
6. Once you have a strong hypothesis supported by evidence, use create_incident_report.
7. If a rollback is needed, use request_rollback.
8. IMPORTANT FOR TOOL ARGUMENTS: When invoking create_incident_report, provide clean, human-readable plain text strings in evidence list (do NOT nest raw unescaped JSON strings inside evidence).
"""
        
        self.tools = [
            {
                "type": "function",
                "function": {
                    "name": "query_metrics",
                    "description": "Query metrics from an observability system like Datadog.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "service": {"type": "string", "description": "The name of the service"},
                            "metric_name": {"type": "string", "description": "The metric to query"},
                            "duration": {"type": "string", "description": "The time window (e.g., '2h')"}
                        },
                        "required": ["service", "metric_name", "duration"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_logs",
                    "description": "Search logs in a system like Splunk.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "service": {"type": "string"},
                            "error_level": {"type": "string"},
                            "keyword": {"type": "string"}
                        },
                        "required": ["service", "error_level"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_deployments",
                    "description": "Retrieve deployment history.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "service": {"type": "string"},
                            "timeframe": {"type": "string"}
                        },
                        "required": ["service", "timeframe"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_incidents",
                    "description": "Search historical incidents.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string"}
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "retrieve_runbook",
                    "description": "Retrieve a runbook for a service issue.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "service": {"type": "string"},
                            "issue_type": {"type": "string"}
                        },
                        "required": ["service", "issue_type"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "create_incident_report",
                    "description": "Creates a structured incident report to finish the investigation.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "root_cause": {"type": "string", "description": "Clear diagnosis of root cause"},
                            "confidence": {"type": "string", "description": "Confidence percentage string e.g. '90%'"},
                            "evidence": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "List of simple human readable evidence bullet points"
                            },
                            "recommended_action": {"type": "string"},
                            "summary": {"type": "string"},
                            "recommendations": {
                                "type": "array",
                                "items": {"type": "string"}
                            }
                        },
                        "required": ["root_cause", "confidence", "evidence", "recommended_action", "summary", "recommendations"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "request_rollback",
                    "description": "Mock requesting a rollback (requires human approval).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "service": {"type": "string"},
                            "target_version": {"type": "string"}
                        },
                        "required": ["service", "target_version"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_knowledge_base",
                    "description": "Search query to retrieve technical documentation, runbooks, and architectural guides. Reformulate your query if previous searches yielded no results.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string"}
                        },
                        "required": ["query"]
                    }
                }
            }
        ]
        
        # Build LangGraph
        workflow = StateGraph(AgentState)
        workflow.add_node("reasoning", self.reasoning_node)
        workflow.add_node("tools", self.tools_node)
        
        workflow.set_entry_point("reasoning")
        workflow.add_conditional_edges("reasoning", self.should_continue)
        workflow.add_conditional_edges("tools", self.route_after_tool)
        
        self.conn = sqlite3.connect("opspilot_trajectories.sqlite", check_same_thread=False)
        self.checkpointer = SqliteSaver(self.conn)
        
        self.graph = workflow.compile(checkpointer=self.checkpointer)
        self.callbacks = None
        self.state = None

    def reasoning_node(self, state: AgentState):
        if self.callbacks and "on_thought" in self.callbacks:
            self.callbacks["on_thought"]("Initializing OpsPilot Agent...")
            
        response = None
        self.current_model_idx = 0  # Always reset model index on each reasoning step
        
        while self.current_model_idx < len(self.free_models):
            current_model = self.free_models[self.current_model_idx]
            try:
                response = self.client.chat.completions.create(
                    model=current_model,
                    messages=state["messages"],
                    tools=self.tools,
                    temperature=0.2,
                    max_tokens=1500
                )
                break
            except RateLimitError:
                if self.callbacks and "on_thought" in self.callbacks:
                    self.callbacks["on_thought"](f"Rate limit exceeded on model '{current_model}'. Shifting to next free model...")
                self.current_model_idx += 1
            except Exception as err:
                if "tool_use_failed" in str(err) or "failed_generation" in str(err) or "decommissioned" in str(err):
                    if self.callbacks and "on_thought" in self.callbacks:
                        self.callbacks["on_thought"](f"Model '{current_model}' error ({str(err)[:60]}...). Retrying with next model...")
                    self.current_model_idx += 1
                else:
                    raise err
                
        if self.current_model_idx >= len(self.free_models):
            return {"is_resolved": False, "final_report": "System Error: All free models have exceeded their rate limits."}

        if not response or not response.choices:
            return {"is_resolved": False, "final_report": "System Error: Failed to get a response from API."}
            
        msg = response.choices[0].message
        msg_dict = {"role": msg.role, "content": msg.content or ""}
        
        if getattr(msg, "tool_calls", None):
            msg_dict["tool_calls"] = [
                {
                    "id": t.id,
                    "type": t.type,
                    "function": {
                        "name": t.function.name,
                        "arguments": t.function.arguments
                    }
                } for t in msg.tool_calls
            ]
        
        if msg.content and self.callbacks and "on_thought" in self.callbacks:
            self.callbacks["on_thought"](msg.content)
            
        return {"messages": [msg_dict], "iteration_count": state.get("iteration_count", 0) + 1}

    def tools_node(self, state: AgentState):
        last_msg = state["messages"][-1]
        tool_calls = last_msg.get("tool_calls", [])
        
        new_messages = []
        new_history = []
        observations = []
        
        for tool_call in tool_calls:
            tool_name = tool_call["function"]["name"]
            tool_args_str = tool_call["function"]["arguments"]
            try:
                tool_args = json.loads(tool_args_str)
            except:
                tool_args = {}
                
            current_tool_call = f"{tool_name}({tool_args})"
            
            duplicate_count = sum(1 for h in state.get("tool_history", [])[-4:] if h == current_tool_call)
            if duplicate_count >= 2:
                result_str = "System Error: Duplicate tool call detected. Aborting to prevent infinite loop."
                new_messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "name": tool_name,
                    "content": result_str
                })
                return {"is_resolved": False, "final_report": "Investigation aborted due to repetitive tool calls.", "messages": new_messages}
                
            new_history.append(current_tool_call)
            
            if self.callbacks and "on_tool_call" in self.callbacks:
                self.callbacks["on_tool_call"](tool_name, tool_args)
                
            try:
                result_str = registry.execute(tool_name, **tool_args)
            except Exception as e:
                result_str = f"Error executing tool '{tool_name}': {str(e)}"
                
            if self.callbacks and "on_observation" in self.callbacks:
                self.callbacks["on_observation"](result_str)
                
            observations.append(f"Result from {tool_name}: {result_str}")
            new_messages.append({
                "role": "tool",
                "tool_call_id": tool_call["id"],
                "name": tool_name,
                "content": result_str
            })
            
            if tool_name == "create_incident_report":
                return {"is_resolved": True, "final_report": result_str, "messages": new_messages, "tool_history": new_history, "observations": observations}
                
            if tool_name == "request_rollback":
                return {"needs_approval": True, "pending_action": {"tool": tool_name, "args": tool_args}, "messages": new_messages, "tool_history": new_history, "observations": observations}
                
        return {"messages": new_messages, "tool_history": new_history, "observations": observations}

    def should_continue(self, state: AgentState):
        if state.get("is_resolved") or state.get("needs_approval"):
            return END
        if state.get("iteration_count", 0) >= state.get("max_iterations", 10):
            return END
        last_msg = state["messages"][-1]
        if last_msg.get("tool_calls"):
            return "tools"
        return END

    def route_after_tool(self, state: AgentState):
        if state.get("is_resolved") or state.get("needs_approval"):
            return END
        
        last_msg = state["messages"][-1]
        if "Duplicate tool call detected" in last_msg.get("content", ""):
            return END
            
        return "reasoning"

    def run(self, incident_request: str, callbacks=None, thread_id: str = "default_thread"):
        self.callbacks = callbacks
        
        if not self.state or not self.state.get("goal"):
            self.state = {
                "goal": incident_request,
                "plan": [],
                "observations": [],
                "tool_history": [],
                "hypotheses": [],
                "evidence": [],
                "messages": [
                    {"role": "system", "content": self.system_instruction},
                    {"role": "user", "content": f"Incident: {incident_request}"}
                ],
                "iteration_count": 0,
                "max_iterations": 10,
                "is_resolved": False,
                "needs_approval": False,
                "pending_action": None,
                "final_report": None
            }
        else:
            self.state["messages"].append({"role": "user", "content": f"Incident: {incident_request}"})
            
        config = {"configurable": {"thread_id": thread_id}}
        final_state = self.graph.invoke(self.state, config=config)
        
        # Merge dicts manually since dict.update overrides lists instead of appending
        # StateGraph already appended to lists inside final_state because of Annotated,
        # so final_state contains the full appended lists. We just replace self.state with it.
        self.state = final_state
        return self.state

    def approve_action(self, approved: bool, thread_id: str = "default_thread"):
        if not self.state or not self.state.get("needs_approval"):
            return self.state

        self.state["needs_approval"] = False
        action_details = self.state.get("pending_action", {})
        self.state["pending_action"] = None

        if approved:
            decision_msg = f"Human Operator APPROVED the action '{action_details.get('tool', 'action')}'. Action executed successfully. Proceed to finalize and create the incident report using create_incident_report."
        else:
            decision_msg = f"Human Operator REJECTED the action '{action_details.get('tool', 'action')}'. Action was cancelled. Proceed to create the incident report using create_incident_report."

        self.state["messages"].append({"role": "user", "content": decision_msg})

        config = {"configurable": {"thread_id": thread_id}}
        final_state = self.graph.invoke(self.state, config=config)
        self.state = final_state
        return self.state

