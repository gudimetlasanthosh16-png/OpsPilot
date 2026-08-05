from typing import Callable, Dict
from opspilot import mock_tools

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, Callable] = {}
        
    def register(self, name: str, func: Callable):
        self._tools[name] = func
        
    def get_tool(self, name: str) -> Callable:
        return self._tools.get(name)
        
    def execute(self, name: str, **kwargs) -> str:
        tool_func = self.get_tool(name)
        if not tool_func:
            return f"Error: Tool '{name}' not found."
        try:
            return tool_func(**kwargs)
        except Exception as e:
            return f"Error executing tool '{name}': {str(e)}"

# Initialize and populate the global registry
registry = ToolRegistry()
registry.register("query_metrics", mock_tools.query_metrics)
registry.register("search_logs", mock_tools.search_logs)
registry.register("get_deployments", mock_tools.get_deployments)
registry.register("search_incidents", mock_tools.search_incidents)
registry.register("retrieve_runbook", mock_tools.retrieve_runbook)
registry.register("create_incident_report", mock_tools.create_incident_report)
registry.register("request_rollback", mock_tools.request_rollback)

# Week 2 RAG
try:
    from opspilot import rag
    registry.register("search_knowledge_base", rag.search_knowledge_base)
except ImportError:
    pass
