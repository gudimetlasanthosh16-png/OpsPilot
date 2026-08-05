import { useState, useRef, useEffect } from 'react';
import './App.css';
import logo from './assets/logo.png';

function TrajectoryView({ trajectory }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!trajectory || trajectory.length === 0) return null;

  const steps = trajectory.filter((m) => m.role !== 'system');

  return (
    <div className="trajectory-container">
      <button
        className="trajectory-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="toggle-icon">{isOpen ? '▼' : '▶'}</span>
        <span className="toggle-label">Agent Execution Trajectory ({steps.length} steps)</span>
      </button>

      {isOpen && (
        <div className="trajectory-timeline">
          {steps.map((step, idx) => {
            if (step.role === 'user') {
              return (
                <div key={idx} className="trajectory-item user-step">
                  <div className="trajectory-badge user">User Input</div>
                  <div className="trajectory-body">{step.content}</div>
                </div>
              );
            }
            if (step.role === 'assistant') {
              return (
                <div key={idx} className="trajectory-item assistant-step">
                  {step.content && (
                    <div className="trajectory-thought">
                      <div className="trajectory-badge thought">🧠 Reasoning</div>
                      <pre className="trajectory-code">{step.content}</pre>
                    </div>
                  )}
                  {step.tool_calls &&
                    step.tool_calls.map((tc, tIdx) => (
                      <div key={tIdx} className="trajectory-tool-call">
                        <div className="trajectory-badge tool">⚡ Action: {tc.function?.name}</div>
                        <pre className="trajectory-code">{tc.function?.arguments}</pre>
                      </div>
                    ))}
                </div>
              );
            }
            if (step.role === 'tool') {
              return (
                <div key={idx} className="trajectory-item tool-step">
                  <div className="trajectory-badge observation">👁️ Observation ({step.name || 'tool'})</div>
                  <pre className="trajectory-code observation-content">{step.content}</pre>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

function IncidentReportCard({ report }) {
  if (!report) return null;
  const rootCause = report.root_cause || report.report?.root_cause || 'Undetermined';
  const confidence = report.confidence || report.report?.confidence || 'N/A';
  const evidence = report.evidence || report.report?.evidence || [];
  const recAction = report.recommended_action || report.report?.recommended_action || 'N/A';
  const summary = report.summary || report.report?.summary || '';
  const recommendations = report.recommendations || report.report?.recommendations || [];

  return (
    <div className="incident-report-card">
      <div className="report-header">
        <span className="report-badge">📋 INCIDENT REPORT</span>
        <span className="confidence-pill">Confidence: {confidence}</span>
      </div>
      
      <div className="report-section">
        <h4>Root Cause</h4>
        <div className="root-cause-box">{rootCause}</div>
      </div>

      {summary && (
        <div className="report-section">
          <h4>Summary</h4>
          <p>{summary}</p>
        </div>
      )}

      {evidence.length > 0 && (
        <div className="report-section">
          <h4>Evidence</h4>
          <ul className="evidence-list">
            {evidence.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="report-section">
        <h4>Recommended Action</h4>
        <div className="action-box">{recAction}</div>
      </div>

      {recommendations.length > 0 && (
        <div className="report-section">
          <h4>Preventive Recommendations</h4>
          <ul>
            {recommendations.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function App() {
  const [incident, setIncident] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [trajectories, setTrajectories] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, loading]);

  const parseReport = (rawReport) => {
    if (!rawReport) return null;
    try {
      const parsed = typeof rawReport === 'string' ? JSON.parse(rawReport) : rawReport;
      if (parsed.report || parsed.root_cause) {
        return parsed.report || parsed;
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!incident.trim()) return;

    const userMessage = incident;
    setIncident('');
    setChatHistory((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, thread_id: threadId }),
      });

      if (!response.ok) {
        let errDetail = 'API Request Failed';
        try {
          const errData = await response.json();
          if (errData.detail) errDetail = `API Error: ${errData.detail}`;
        } catch (_) {}
        throw new Error(errDetail);
      }

      const data = await response.json();
      setThreadId(data.thread_id);

      const parsed = parseReport(data.report);

      setChatHistory((prev) => [
        ...prev,
        {
          role: 'agent',
          content: data.report,
          parsedReport: parsed,
          isResolved: data.is_resolved,
          needsApproval: data.needs_approval,
          trajectory: data.trajectory || [],
        },
      ]);
    } catch (err) {
      if (err.name === 'TypeError' || err.message.includes('fetch')) {
        setError('Cannot connect to OpsPilot API backend (http://localhost:8000). Please ensure the backend server is running.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalDecision = async (approved) => {
    if (!threadId) return;
    setLoading(true);
    setError(null);

    setChatHistory((prev) => [
      ...prev,
      { role: 'user', content: approved ? 'APPROVED Rollback Action' : 'REJECTED Rollback Action' },
    ]);

    try {
      const response = await fetch('http://localhost:8000/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId, approved }),
      });

      if (!response.ok) {
        let errDetail = 'Approval API Request Failed';
        try {
          const errData = await response.json();
          if (errData.detail) errDetail = `API Error: ${errData.detail}`;
        } catch (_) {}
        throw new Error(errDetail);
      }

      const data = await response.json();
      const parsed = parseReport(data.report);

      setChatHistory((prev) => [
        ...prev,
        {
          role: 'agent',
          content: data.report,
          parsedReport: parsed,
          isResolved: data.is_resolved,
          needsApproval: data.needs_approval,
          trajectory: data.trajectory || [],
        },
      ]);
    } catch (err) {
      if (err.name === 'TypeError' || err.message.includes('fetch')) {
        setError('Cannot connect to OpsPilot API backend (http://localhost:8000). Please ensure the backend server is running.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTrajectories = async () => {
    if (!threadId) return;
    try {
      const response = await fetch(`http://localhost:8000/trajectories/${threadId}`);
      if (response.ok) {
        const data = await response.json();
        setTrajectories(data.checkpoints);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={`layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 90,
          }}
        />
      )}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <img src={logo} alt="OpsPilot Logo" className="sidebar-logo" />
            <h2>OpsPilot AI</h2>
          </div>
          <button
            className="sidebar-toggle-btn"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title="Collapse Sidebar"
          >
            «
          </button>
        </div>

        <button
          className="new-chat-btn"
          onClick={() => {
            setChatHistory([]);
            setThreadId(null);
            setTrajectories([]);
            setIsSidebarOpen(false);
          }}
        >
          <span className="plus-icon">+</span> New Investigation
        </button>

        <div className="sidebar-content">
          <h3>Observability</h3>
          <p className="thread-id">ID: {threadId || 'No active thread'}</p>
          <button onClick={fetchTrajectories} disabled={!threadId} className="trajectory-btn">
            Load Trajectories
          </button>
          {trajectories.length > 0 && (
            <ul className="trajectory-list">
              {trajectories.map((t, idx) => (
                <li key={idx}>
                  <div className="checkpoint-title">Checkpoint {t.checkpoint_id}</div>
                  <div className="checkpoint-size">Size: {t.data_size} bytes</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <main className="main-content">
        <div className="top-nav">
          <button
            className="sidebar-expand-btn"
            onClick={() => {
              setIsSidebarCollapsed(!isSidebarCollapsed);
              setIsSidebarOpen(!isSidebarOpen);
            }}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            ☰ {isSidebarCollapsed ? 'Open Sidebar' : 'Sidebar'}
          </button>
          <div className="status-pill">
            <span className="status-dot green"></span> OpsPilot API: Online (Port 8000)
          </div>
        </div>

        <div className="chat-container">
          <div className={`centered-bg-logo-wrapper ${chatHistory.length > 0 ? 'watermark' : 'prominent'}`}>
            <img src={logo} alt="OpsPilot Logo" className="centered-bg-logo" />
          </div>

          {chatHistory.length === 0 ? (
            <div className="empty-state">
              <div className="hacking-intro">SYSTEM.ACCESS_GRANTED</div>
              <div className="hacking-subtext">Awaiting input command... OpsPilot Autonomous Agent initialized.</div>
              <div className="quick-prompts">
                <button
                  type="button"
                  className="prompt-chip"
                  onClick={() => setIncident('Alert: payment-gateway has 500 errors and timeouts over the last hour.')}
                >
                  <span className="chip-icon">🚨</span>
                  <div className="chip-text">
                    <strong>Payment Gateway Timeouts</strong>
                    <small>Alert: 500 errors over the last hour</small>
                  </div>
                </button>
                <button
                  type="button"
                  className="prompt-chip"
                  onClick={() => setIncident('Investigate why checkout-api latency has increased over the last 2 hours.')}
                >
                  <span className="chip-icon">🐢</span>
                  <div className="chip-text">
                    <strong>Checkout Latency Spike</strong>
                    <small>Investigate API response degradation</small>
                  </div>
                </button>
                <button
                  type="button"
                  className="prompt-chip"
                  onClick={() => setIncident('inventory-service pods are crashing with OOM errors and restarting frequently.')}
                >
                  <span className="chip-icon">💥</span>
                  <div className="chip-text">
                    <strong>Inventory OOM Crash</strong>
                    <small>Pods restarting frequently with memory leak</small>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="messages-wrapper">
              {chatHistory.map((msg, index) => (
                <div key={index} className={`message-row ${msg.role}`}>
                  <div className="message-content">
                    <div className="avatar">{msg.role === 'agent' ? '🤖' : 'U'}</div>
                    <div className="message-bubble">
                      {msg.parsedReport ? (
                        <IncidentReportCard report={msg.parsedReport} />
                      ) : (
                        <pre className="text-content">{msg.content}</pre>
                      )}

                      {msg.needsApproval && (
                        <div className="approval-card">
                          <div className="approval-title">⚠️ Human Approval Required for High-Impact Action</div>
                          <div className="approval-desc">
                            The agent requests authorization to execute a service rollback.
                          </div>
                          <div className="approval-actions">
                            <button
                              className="btn-approve"
                              onClick={() => handleApprovalDecision(true)}
                              disabled={loading}
                            >
                              ✓ Approve Rollback
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => handleApprovalDecision(false)}
                              disabled={loading}
                            >
                              ✕ Reject Action
                            </button>
                          </div>
                        </div>
                      )}

                      {msg.role === 'agent' && msg.trajectory && msg.trajectory.length > 0 && (
                        <TrajectoryView trajectory={msg.trajectory} />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="message-row agent">
                  <div className="message-content">
                    <div className="avatar pulse">🤖</div>
                    <div className="message-bubble">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="message-row agent">
                  <div className="message-content">
                    <div className="avatar">⚠️</div>
                    <div className="message-bubble error-bubble">
                      <p>Error: {error}</p>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="input-container">
          <form className="input-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Message OpsPilot..."
              value={incident}
              onChange={(e) => setIncident(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !incident.trim()}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="send-icon">
                <path
                  d="M22 2L11 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M22 2L15 22L11 13L2 9L22 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
          <div className="disclaimer">
            OpsPilot Autonomous Incident Agent • Grounded in Logs, Telemetry & Runbooks
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
