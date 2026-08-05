# OpsPilot

**OpsPilot** is an Autonomous Incident Investigation Agent designed to help modern engineering teams automatically investigate production incidents by reasoning over metrics, logs, deployments, runbooks, and historical incidents.

This repository currently implements:
- [x] **Week 1:** Setup Groq/OpenAI, basic tool calling loop.
- [x] **Week 2:** Advanced Tool Integration, RAG Knowledge Base, Agentic Retrieval.
- [x] **Week 3:** LangGraph Migration, Trajectory Observability, Automated Evaluation, FastAPI + React UI, Docker.

## 🚀 Quick Start (Week 3 Web UI)

You can run the entire stack using Docker Compose:

```bash
docker-compose up --build
```

Then visit [http://localhost:3000](http://localhost:3000) to access the React Web UI.

## 💻 Legacy CLI Mode

If you prefer the terminal, you can run the CLI:

```bash
# On Windows, you may need to ensure UTF-8 encoding for Rich UI elements:
set PYTHONIOENCODING=utf-8

python -m opspilot.cli
```

## 📋 Features

- **Autonomous Investigation Loop:** The agent continuously plans, selects tools, observes results, and forms hypotheses based on the data.
- **Agentic RAG Knowledge Layer:** Uses ChromaDB and embedding search to dynamically fetch architectural docs and runbooks if context is missing, allowing for query reformulation.
- **Reflection & Verification:** Before concluding an investigation, the agent pauses to critically reflect on whether its hypothesis is fully supported by evidence, triggering re-planning if contradictions exist.
- **Dynamic Tool Registry:** Easily extensible tool calling system. Includes pre-configured mock tools:
  - `query_metrics`
  - `search_logs`
  - `get_deployments`
  - `search_incidents`
  - `retrieve_runbook`
  - `search_knowledge_base`
  - `create_incident_report`
  - `request_rollback`
- **Bounded Autonomy & Loop Detection:** OpsPilot enforces safety boundaries, prevents duplicate identical tool calls in infinite loops, and gracefully recovers from errors.
- **Continuous Chat Context:** The CLI operates in a continuous loop, allowing you to ask follow-up questions or request new investigations without restarting.
- **Human-in-the-Loop:** High-impact operational actions (like executing a rollback) require explicit human approval (`y/n`) before executing.

## 📋 Prerequisites

- Python 3.10+
- An [OpenRouter API Key](https://openrouter.ai/) for accessing the `google/gemma-4-26b-a4b-it:free` model (or any compatible OpenAI-format LLM).

## 🛠️ Setup

1. **Clone the repository and enter the directory:**
   ```bash
   cd opspilot
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install the dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure your environment variables:**
   - Copy `.env.example` to `.env`
   - Add your `OPENROUTER_API_KEY` to the `.env` file.

## 💻 Usage

Start the interactive CLI:

```bash
# On Windows, you may need to ensure UTF-8 encoding for Rich UI elements:
set PYTHONIOENCODING=utf-8

python -m opspilot.cli
```

### Example Prompt Flow

Once the CLI is running, try pasting the following prompt:
> *"Investigate why checkout API latency has increased over the last 2 hours."*

**The agent will:**
1. Call `query_metrics` to confirm the latency spike.
2. Call `search_logs` and discover database timeout errors.
3. Check `get_deployments` to identify the recent deployment `checkout-v2.4`.
4. Optionally check `search_incidents` and `retrieve_runbook`.
5. Call `request_rollback`, prompting you for `y/n` approval.
6. Call `create_incident_report` and output a finalized markdown report containing the Root Cause, Confidence, Evidence, and Recommended Action.

You can then ask follow-up questions directly in the terminal to continue the conversation.

## 🏗️ Architecture

- **`cli.py`**: The main entry point containing the Rich-based terminal UI, continuous chat loop, and human-in-the-loop approval interception.
- **`agent.py`**: The core `OpsPilotAgent` class managing the OpenAI API client, conversational state persistence, tool execution loop, error recovery, and loop detection.
- **`tool_registry.py`**: A centralized `ToolRegistry` pattern that maps LLM tool calls to their respective Python function definitions.
- **`mock_tools.py`**: A suite of simulated infrastructure functions that return JSON data for the agent to analyze.
- **`schemas.py`**: Pydantic models enforcing structured types for tool arguments and tracking the global `AgentState`.
