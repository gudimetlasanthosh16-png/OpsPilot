import uuid
import os
import sqlite3
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware

from opspilot.agent import OpsPilotAgent

app = FastAPI(title="OpsPilot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global agent instance
agent = OpsPilotAgent()

@app.get("/", response_class=HTMLResponse)
def root():
    return """
    <!DOCTYPE html>
    <html>
        <head>
            <title>OpsPilot API Backend</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #1e293b; border-radius: 12px; padding: 2rem; max-width: 500px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; }
                h1 { color: #38bdf8; margin-top: 0; font-size: 1.8rem; }
                p { color: #94a3b8; line-height: 1.6; }
                .badge { background: #0284c7; color: white; padding: 4px 10px; border-radius: 9999px; font-size: 0.8rem; font-weight: bold; }
                .btn { display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 10px 16px; border-radius: 6px; margin-top: 15px; font-weight: 500; transition: background 0.2s; }
                .btn:hover { background: #1d4ed8; }
                .btn-alt { background: #334155; margin-left: 10px; }
                .btn-alt:hover { background: #475569; }
            </style>
        </head>
        <body>
            <div class="card">
                <span class="badge">ONLINE</span>
                <h1>OpsPilot API Backend</h1>
                <p>The OpsPilot Agentic AI REST API backend server is active on port 8000.</p>
                <p>To use the full interactive user interface, open the React Web UI on port 5173 or 3000.</p>
                <a href="http://localhost:5173" class="btn">Launch React UI</a>
                <a href="/docs" class="btn btn-alt">API Docs (Swagger)</a>
            </div>
        </body>
    </html>
    """

class ChatRequest(BaseModel):
    message: str
    thread_id: Optional[str] = None

class ApprovalRequest(BaseModel):
    thread_id: str
    approved: bool

class ChatResponse(BaseModel):
    report: str
    is_resolved: bool
    needs_approval: bool
    thread_id: str
    trajectory: Optional[list] = None

@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    thread_id = request.thread_id or str(uuid.uuid4())
    
    try:
        state = agent.run(request.message, thread_id=thread_id)
        
        return ChatResponse(
            report=state.get("final_report") or "",
            is_resolved=state.get("is_resolved", False),
            needs_approval=state.get("needs_approval", False),
            thread_id=thread_id,
            trajectory=state.get("messages", [])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/approve", response_model=ChatResponse)
def approve_endpoint(request: ApprovalRequest):
    try:
        state = agent.approve_action(approved=request.approved, thread_id=request.thread_id)
        
        return ChatResponse(
            report=state.get("final_report") or "",
            is_resolved=state.get("is_resolved", False),
            needs_approval=state.get("needs_approval", False),
            thread_id=request.thread_id,
            trajectory=state.get("messages", [])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/trajectories/{thread_id}")
def get_trajectory(thread_id: str):
    try:
        conn = sqlite3.connect("opspilot_trajectories.sqlite")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT thread_id, checkpoint_id, checkpoint FROM checkpoints WHERE thread_id = ? ORDER BY checkpoint_id ASC", (thread_id,))
        rows = cursor.fetchall()
        
        history = []
        for row in rows:
            history.append({
                "thread_id": row["thread_id"],
                "checkpoint_id": row["checkpoint_id"],
                "data_size": len(row["checkpoint"])
            })
            
        return {"thread_id": thread_id, "checkpoints": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
