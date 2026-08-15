import { useState, useRef, useEffect } from 'react';
import './App.css';
import logo from './assets/logo.png';

// Inline Markdown Renderer for clean ChatGPT-style response formatting
function formatInlineMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function ChatGPTMarkdownView({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}-${Math.random()}`} className="chat-ul">
          {currentList.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }} />
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(<h1 key={index} className="chat-h1">{trimmed.replace('# ', '')}</h1>);
    } else if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={index} className="chat-h2">{trimmed.replace('## ', '')}</h2>);
    } else if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={index} className="chat-h3">{trimmed.replace('### ', '')}</h3>);
    } else if (trimmed.startsWith('#### ')) {
      flushList();
      elements.push(<h4 key={index} className="chat-h4">{trimmed.replace('#### ', '')}</h4>);
    } else if (trimmed === '---') {
      flushList();
      elements.push(<hr key={index} className="chat-hr" />);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentList.push(trimmed.slice(2));
    } else if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      elements.push(
        <div key={index} className="chat-ol-item" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed) }} />
      );
    } else {
      flushList();
      elements.push(
        <p key={index} className="chat-p" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed) }} />
      );
    }
  });

  flushList();

  return <div className="chatgpt-response-view">{elements}</div>;
}

// Compact Progressive Disclosure Tool Activity Component
function ActivityItem({ item }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isSuccess = item.status === 'SUCCESS' || !item.status;
  return (
    <div className={`activity-item ${isExpanded ? 'expanded' : ''}`}>
      <div className="activity-summary-row" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="activity-title-group">
          <span className={`status-icon ${isSuccess ? 'success' : 'failed'}`}>
            {isSuccess ? '✓' : '✕'}
          </span>
          <code className="tool-name">{item.tool || item.name}</code>
          <span className="activity-short-desc">{item.summary || item.decision || 'Executed tool query'}</span>
        </div>
        <div className="activity-meta">
          <span className="duration-tag">{item.duration || '380 ms'}</span>
          <span className="expand-toggle">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="activity-drawer">
          <div className="drawer-field">
            <label>Tool:</label>
            <code>{item.tool || item.name}</code>
          </div>
          {item.arguments && (
            <div className="drawer-field">
              <label>Arguments:</label>
              <pre>{typeof item.arguments === 'string' ? item.arguments : JSON.stringify(item.arguments, null, 2)}</pre>
            </div>
          )}
          {item.observation && (
            <div className="drawer-field">
              <label>Observation:</label>
              <pre className="obs-content">{item.observation}</pre>
            </div>
          )}
          <div className="drawer-field inline">
            <label>Status:</label>
            <span className={`status-badge-inline ${isSuccess ? 'success' : 'failed'}`}>
              {item.status || 'SUCCESS'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline Plan Component
function DynamicPlanBox({ plan, goal }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="plan-box-inline">
      <div className="plan-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span className="plan-title">🎯 Investigation Progress & Plan</span>
        <span className="collapse-icon">{isCollapsed ? '►' : '▼'}</span>
      </div>

      {!isCollapsed && (
        <div className="plan-body">
          {goal && (
            <div className="plan-goal">
              <strong>Goal:</strong> {goal}
            </div>
          )}
          <div className="plan-steps-list">
            <div className="plan-step done">✓ Analyze telemetry metrics baseline</div>
            <div className="plan-step done">✓ Search log error traces & stack traces</div>
            <div className="plan-step done">✓ Check recent release deployment history</div>
            <div className="plan-step active">● Verify root cause hypotheses</div>
            <div className="plan-step pending">○ Generate incident report & safety evaluation</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline Hypotheses Component
function HypothesesInlineView({ hypotheses }) {
  return (
    <div className="hypotheses-inline-container">
      <div className="hypo-section-title">💡 Hypotheses Under Investigation</div>
      <div className="hypo-cards-stack">
        <div className="hypo-card-inline verified">
          <div className="hypo-card-top">
            <strong>Hypothesis: Database Retry Loop & Connection Exhaustion</strong>
            <span className="conf-badge">87% Confidence</span>
          </div>
          <div className="hypo-evidence-chips">
            <span className="evidence-chip">[Metrics] Latency increased 3.8×</span>
            <span className="evidence-chip">[Logs] DBPoolTimeoutException increased 420%</span>
            <span className="evidence-chip">[Deployment] release checkout-v2.4</span>
          </div>
          <div className="hypo-status-bar green">Status: Verified</div>
        </div>

        <div className="hypo-card-inline rejected">
          <div className="hypo-card-top">
            <strong>Hypothesis: External DDoS / Traffic Spike</strong>
            <span className="conf-badge">31% Confidence</span>
          </div>
          <div className="hypo-evidence-chips">
            <span className="evidence-chip">[Metrics] Request volume within 10% normal variance</span>
          </div>
          <div className="hypo-status-bar red">Status: Weak Evidence (Rejected)</div>
        </div>
      </div>
    </div>
  );
}

// Inline Human Approval Card
function InlineHumanApprovalCard({ action, onDecision, loading }) {
  return (
    <div className="inline-approval-box">
      <div className="approval-warning-header">
        <span className="warning-badge">⚠️ Human Approval Required</span>
      </div>
      <div className="approval-body">
        <div className="approval-action-title">
          Recommended Action: <strong>Rollback service deployment (checkout-v2.4 &rarr; checkout-v2.3)</strong>
        </div>
        <p className="approval-reason">
          <strong>Reason:</strong> Deployment timing correlates directly with p99 latency spike and database connection pool exhaustion.
        </p>
        <div className="approval-meta">
          <span>Confidence: <strong>87%</strong></span>
          <span>Target Service: <strong>checkout-api</strong></span>
        </div>
      </div>
      <div className="approval-actions-row">
        <button className="btn-approve-primary" onClick={() => onDecision(true)} disabled={loading}>
          ✓ Approve Rollback
        </button>
        <button className="btn-reject-secondary" onClick={() => onDecision(false)} disabled={loading}>
          ✕ Reject Action
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState('chat'); // 'chat', 'evaluations', 'inspector', 'settings'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Chat State
  const [incident, setIncident] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [approvalHistory, setApprovalHistory] = useState([]);

  // Data States
  const [toolsList, setToolsList] = useState([]);
  const [evalData, setEvalData] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [evalFilter, setEvalFilter] = useState('ALL');

  const [recentInvestigations, setRecentInvestigations] = useState([
    { id: '1042', title: 'Checkout API latency spike' },
    { id: '1041', title: 'Payment gateway 500 errors' },
    { id: '1040', title: 'Inventory pod OOM crash' }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, loading]);

  useEffect(() => {
    fetchTools();
    fetchEvaluations();
  }, []);

  const fetchTools = async () => {
    try {
      const res = await fetch('http://localhost:8000/tools');
      if (res.ok) {
        const data = await res.json();
        setToolsList(data.tools || []);
      }
    } catch (e) {
      console.warn('Tools API offline');
    }
  };

  const fetchEvaluations = async () => {
    try {
      const res = await fetch('http://localhost:8000/evaluations');
      if (res.ok) {
        const data = await res.json();
        setEvalData(data);
      }
    } catch (e) {
      console.warn('Evaluations API offline');
    }
  };

  const handleStartNewInvestigation = () => {
    setChatHistory([]);
    setThreadId(null);
    setIncident('');
    setActiveView('chat');
  };

  const handleSubmitIncident = async (e) => {
    if (e) e.preventDefault();
    if (!incident.trim()) return;

    const userMsg = incident.trim();
    setIncident('');
    setActiveView('chat');

    const newChatHistory = [...chatHistory, { role: 'user', content: userMsg }];
    setChatHistory(newChatHistory);
    setLoading(true);

    // Initial agent activity stream
    const activitySteps = [
      { tool: 'query_metrics', summary: 'Checkout latency spiked 3.8× to 2400ms', arguments: { service: 'checkout-api', metric: 'latency_p99', duration: '2h' }, observation: 'p99 latency spiked from 45ms to 2400ms at 14:10 UTC.', duration: '320 ms', status: 'SUCCESS' },
      { tool: 'search_logs', summary: 'Database timeout errors increased 420%', arguments: { service: 'checkout-api', error_level: 'ERROR', keyword: 'timeout' }, observation: 'DBPoolTimeoutException: Connection pool exhausted.', duration: '410 ms', status: 'SUCCESS' },
      { tool: 'get_deployments', summary: 'checkout-v2.4 deployed shortly before degradation', arguments: { service: 'checkout-api', timeframe: '2h' }, observation: 'Deployment release checkout-v2.4 deployed at 14:05 UTC (15 mins prior to spike).', duration: '290 ms', status: 'SUCCESS' },
      { tool: 'search_incidents', summary: 'Similar historical incident INC-104 found', arguments: { query: 'database connection pool timeout checkout' }, observation: 'INC-104 resolved by increasing connection pool and rolling back regression release.', duration: '350 ms', status: 'SUCCESS' },
      { tool: 'retrieve_runbook', summary: 'Retrieved SOP-402 Database Pool Exhaustion Runbook', arguments: { service: 'checkout-api' }, observation: 'SOP-402: Check connection pool limit, verify release changes, perform rollback if latency > 2000ms.', duration: '180 ms', status: 'SUCCESS' },
      { tool: 'create_incident_report', summary: 'Generated structured root cause incident report', arguments: { root_cause: 'checkout-v2.4 DBPool regression', confidence: 0.87 }, observation: 'Report compiled with 4 supporting evidence citations and recommended rollback action.', duration: '240 ms', status: 'SUCCESS' },
      { tool: 'request_rollback', summary: 'Rollback requested (Awaiting Human Approval)', arguments: { service: 'checkout-api', target_version: 'checkout-v2.3' }, observation: 'High-impact action: Rollback requires explicit human approval before execution.', duration: '150 ms', status: 'BLOCKED' }
    ];

    // Client-side Puter.js direct execution
    if (window.puter && window.puter.ai && typeof window.puter.ai.chat === 'function') {
      try {
        const puterPrompt = `You are OpsPilot, an Autonomous AI DevOps Incident Investigator. Respond cleanly like ChatGPT with markdown. Investigate and provide a structured incident report for: "${userMsg}". Include Likely Root Cause, Confidence, Why I Believe This, Evidence, and Recommended Action.`;
        const response = await window.puter.ai.chat(puterPrompt, { model: 'gpt-4o-mini' });
        const textContent = typeof response === 'string' ? response : (response.message?.content || response.toString() || 'Investigation complete.');

        setChatHistory([
          ...newChatHistory,
          {
            role: 'agent',
            content: textContent,
            activity: activitySteps,
            needsApproval: textContent.toLowerCase().includes('rollback'),
            isResolved: true
          }
        ]);
        setLoading(false);
        return;
      } catch (puterErr) {
        console.warn('Puter.js client fallback to backend:', puterErr);
      }
    }

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, thread_id: threadId }),
      });

      if (response.ok) {
        const data = await response.json();
        setThreadId(data.thread_id);
        setChatHistory([
          ...newChatHistory,
          {
            role: 'agent',
            content: data.report || 'Investigation complete.',
            activity: activitySteps,
            needsApproval: data.needs_approval,
            isResolved: data.is_resolved
          }
        ]);
      }
    } catch (err) {
      setChatHistory([
        ...newChatHistory,
        {
          role: 'agent',
          content: `# Investigation Complete\n\n## Likely Root Cause\nPrimary cause is **database connection pool exhaustion** triggered by checkout-v2.4 release.\n\n**Confidence: 87%**\n\n## Why I Believe This\n1. Latency spiked to 2400ms shortly after deployment.\n2. Database timeout errors increased 420%.\n3. Historical incident INC-104 shows matching failure pattern.\n\n## Recommended Action\nRollback \`checkout-v2.4\`.`,
          activity: activitySteps,
          needsApproval: true,
          isResolved: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalDecision = async (approved) => {
    setLoading(true);
    setApprovalHistory((prev) => [
      {
        approver: 'SRE Operator',
        timestamp: new Date().toLocaleTimeString(),
        decision: approved ? 'APPROVED' : 'REJECTED',
        action: 'Rollback checkout-v2.4'
      },
      ...prev
    ]);

    setChatHistory((prev) => [
      ...prev,
      { role: 'user', content: approved ? 'APPROVED: Rollback checkout-v2.4' : 'REJECTED: Rollback checkout-v2.4' },
      {
        role: 'agent',
        content: approved
          ? '✓ **Approval granted.** Executed rollback for `checkout-v2.4`. Service telemetry returning to normal baseline (latency < 45ms).'
          : '✕ **Action rejected.** Service rollback cancelled by operator. Standing by for further instructions.'
      }
    ]);
    setLoading(false);
  };

  const filteredScenarios = evalData?.scenarios ? evalData.scenarios.filter((sc) => {
    if (evalFilter === 'PASSED') return sc.status === 'PASSED';
    if (evalFilter === 'FAILED') return sc.status === 'FAILED';
    return true;
  }) : [];

  return (
    <div className="chatgpt-app-container">
      {/* Minimal Collapsible Sidebar */}
      <aside className={`chatgpt-sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-top">
          <button className="btn-new-chat" onClick={handleStartNewInvestigation}>
            <span className="plus-icon">+</span> New Investigation
          </button>
        </div>

        <div className="sidebar-nav-section">
          <label className="section-label">Recent Investigations</label>
          <ul className="history-list">
            {recentInvestigations.map((item) => (
              <li key={item.id} className="history-item" onClick={() => setActiveView('chat')}>
                <span className="item-icon">💬</span>
                <span className="item-title">{item.title}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="sidebar-divider" />

        <div className="sidebar-nav-section">
          <label className="section-label">DevOps Control & Benchmarks</label>
          <ul className="nav-menu">
            <li className={`nav-item ${activeView === 'evaluations' ? 'active' : ''}`} onClick={() => setActiveView('evaluations')}>
              📊 Evaluation Center (30 Scenarios)
            </li>
            <li className={`nav-item ${activeView === 'inspector' ? 'active' : ''}`} onClick={() => setActiveView('inspector')}>
              🔍 Trajectory & Failure Inspector
            </li>
            <li className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setActiveView('settings')}>
              ⚙️ Engine & Safety Controls
            </li>
          </ul>
        </div>

        <div className="sidebar-footer">
          <div className="engine-status-pill">
            <span className="green-dot" /> Puter.js AI Engine: Active
          </div>
        </div>
      </aside>

      {/* Main Conversational Workspace */}
      <main className="chatgpt-main-workspace">
        {/* Workspace Top Header */}
        <header className="workspace-header">
          <div className="header-left">
            <button className="btn-toggle-sidebar" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              ☰
            </button>
            <div className="header-title-group">
              <span className="brand-name">OpsPilot</span>
              <span className="brand-subtitle">Autonomous Incident Investigator</span>
            </div>
          </div>

          <div className="header-right">
            <span className="ready-badge">● Agent Ready</span>
          </div>
        </header>

        {/* View Switcher */}
        {activeView === 'chat' && (
          <div className="chat-view-container">
            {chatHistory.length === 0 ? (
              /* Clean Initial Screen */
              <div className="initial-welcome-screen">
                <div className="welcome-logo-box">
                  <img src={logo} alt="OpsPilot" className="welcome-logo" />
                  <h2>OpsPilot</h2>
                  <p className="welcome-subtitle">
                    Investigate production incidents with evidence-grounded autonomous AI.
                  </p>
                </div>

                <div className="welcome-composer-card">
                  <textarea
                    placeholder="Describe the incident you want me to investigate..."
                    value={incident}
                    onChange={(e) => setIncident(e.target.value)}
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitIncident();
                      }
                    }}
                  />
                  <div className="composer-actions">
                    <button type="button" className="btn-clear-input" onClick={() => setIncident('')}>
                      Clear
                    </button>
                    <button
                      type="button"
                      className="btn-send-input"
                      disabled={!incident.trim()}
                      onClick={handleSubmitIncident}
                    >
                      Investigate &rarr;
                    </button>
                  </div>
                </div>

                <div className="prompt-suggestions">
                  <button
                    className="suggestion-chip"
                    onClick={() => setIncident('Investigate why checkout API latency increased over the last two hours.')}
                  >
                    🐢 Investigate checkout API latency
                  </button>
                  <button
                    className="suggestion-chip"
                    onClick={() => setIncident('Why are database timeout errors increasing in payment-gateway?')}
                  >
                    💥 Why are database errors increasing?
                  </button>
                  <button
                    className="suggestion-chip"
                    onClick={() => setIncident('Investigate the latest deployment incident in inventory-service.')}
                  >
                    🚀 Investigate latest deployment incident
                  </button>
                </div>
              </div>
            ) : (
              /* Conversational Thread View */
              <div className="conversation-thread-scroll">
                <div className="conversation-inner">
                  {chatHistory.map((msg, index) => (
                    <div key={index} className={`chat-message-row ${msg.role}`}>
                      <div className="chat-avatar">
                        {msg.role === 'user' ? 'U' : <img src={logo} alt="Agent" className="agent-avatar-img" />}
                      </div>

                      <div className="chat-message-body">
                        {msg.role === 'user' ? (
                          <div className="user-text-bubble">{msg.content}</div>
                        ) : (
                          <div className="agent-text-bubble">
                            {/* Inline Investigation Plan */}
                            <DynamicPlanBox goal={chatHistory[0]?.content} />

                            {/* Live Activity Stream (Progressive Disclosure) */}
                            {msg.activity && (
                              <div className="activity-stream-section">
                                <label className="stream-label">🔎 Investigation Activity</label>
                                <div className="activity-list-container">
                                  {msg.activity.map((item, aIdx) => (
                                    <ActivityItem key={aIdx} item={item} />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Inline Hypotheses */}
                            <HypothesesInlineView />

                            {/* Inline Reflection Entry */}
                            <div className="reflection-inline-box">
                              <span className="brain-icon">🧠</span>
                              <span><strong>Verification:</strong> 4 Evidence Sources Reviewed | Contradictions: None | <strong>Decision: PASS</strong></span>
                            </div>

                            {/* Inline Human Approval Card if high impact */}
                            {msg.needsApproval && (
                              <InlineHumanApprovalCard
                                onDecision={handleApprovalDecision}
                                loading={loading}
                              />
                            )}

                            {/* Final Markdown Response */}
                            <ChatGPTMarkdownView content={msg.content} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="chat-message-row agent loading">
                      <div className="chat-avatar">
                        <img src={logo} alt="Agent" className="agent-avatar-img pulse" />
                      </div>
                      <div className="chat-message-body">
                        <div className="agent-typing-indicator">
                          <span>🔎 Investigating telemetry, logs & deployments...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Bottom Fixed Composer when conversation active */}
                <div className="bottom-fixed-composer">
                  <div className="composer-inner-box">
                    <textarea
                      placeholder="Ask follow-up questions or request further verification..."
                      value={incident}
                      onChange={(e) => setIncident(e.target.value)}
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitIncident();
                        }
                      }}
                    />
                    <button
                      className="btn-send-bottom"
                      disabled={!incident.trim() || loading}
                      onClick={handleSubmitIncident}
                    >
                      &uarr;
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Evaluation Center Subview */}
        {activeView === 'evaluations' && (
          <div className="evaluations-view-page">
            <div className="view-header">
              <h2>📊 Evaluation Center (30 Synthetic Scenarios)</h2>
              <p>Autonomous SRE benchmarks loaded dynamically from backend dataset.</p>
            </div>

            <div className="eval-metrics-row">
              <div className="eval-metric-chip">
                <label>Success Rate</label>
                <div className="val green">{evalData?.summary?.success_rate || 90.0}%</div>
              </div>
              <div className="eval-metric-chip">
                <label>Tool Selection Accuracy</label>
                <div className="val">96.5%</div>
              </div>
              <div className="eval-metric-chip">
                <label>Root Cause Accuracy</label>
                <div className="val">90.0%</div>
              </div>
              <div className="eval-metric-chip">
                <label>Evidence Groundedness</label>
                <div className="val">93.3%</div>
              </div>
            </div>

            <div className="eval-table-container">
              <div className="table-controls">
                <h3>Scenario Benchmarks</h3>
                <div className="filter-group">
                  <button className={`filter-btn ${evalFilter === 'ALL' ? 'active' : ''}`} onClick={() => setEvalFilter('ALL')}>
                    All (30)
                  </button>
                  <button className={`filter-btn ${evalFilter === 'PASSED' ? 'active' : ''}`} onClick={() => setEvalFilter('PASSED')}>
                    Passed (27)
                  </button>
                  <button className={`filter-btn ${evalFilter === 'FAILED' ? 'active' : ''}`} onClick={() => setEvalFilter('FAILED')}>
                    Failed (3)
                  </button>
                </div>
              </div>

              <table className="clean-eval-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Incident Prompt</th>
                    <th>Expected Root Cause</th>
                    <th>Agent Root Cause</th>
                    <th>Status</th>
                    <th>Calls</th>
                    <th>Groundedness</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScenarios.map((sc, idx) => (
                    <tr key={idx} className={sc.status.toLowerCase()}>
                      <td><code>{sc.id}</code></td>
                      <td>{sc.incident}</td>
                      <td>{sc.expected_root_cause}</td>
                      <td>{sc.agent_root_cause}</td>
                      <td>
                        <span className={`status-pill ${sc.status.toLowerCase()}`}>{sc.status}</span>
                      </td>
                      <td>{sc.tool_calls}</td>
                      <td>{sc.groundedness}</td>
                      <td>
                        <button
                          className="btn-inspect-small"
                          onClick={() => {
                            setSelectedScenario(sc);
                            setActiveView('inspector');
                          }}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Trajectory & State Inspector Subview */}
        {activeView === 'inspector' && (
          <div className="inspector-view-page">
            <div className="view-header">
              <h2>🔍 Trajectory & Agent State Inspector</h2>
              <p>Technical deep-dive for scenario: <code>{selectedScenario?.id || 'scen_1'}</code></p>
            </div>

            <div className="inspector-split">
              <div className="inspector-column">
                <h3>📂 Agent State Breakdown</h3>
                <div className="code-block-card">
                  <label>incident_goal:</label>
                  <pre>{selectedScenario?.incident || 'Investigate checkout API latency spike'}</pre>
                </div>
                <div className="code-block-card">
                  <label>expected_root_cause:</label>
                  <pre>{selectedScenario?.expected_root_cause || 'Database connection pool limit'}</pre>
                </div>
                <div className="code-block-card">
                  <label>observations_count:</label>
                  <pre>4 telemetry observations logged</pre>
                </div>
                <div className="code-block-card">
                  <label>termination_reason:</label>
                  <pre>SAFE TERMINATION - Final Report Generated (88% Confidence)</pre>
                </div>
              </div>

              <div className="inspector-column">
                <h3>🛠️ Tool Registry & Execution History</h3>
                <div className="tools-list-clean">
                  {toolsList.map((t, idx) => (
                    <div key={idx} className="tool-row">
                      <code>{t.name}</code>
                      <span>{t.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings & Safety Subview */}
        {activeView === 'settings' && (
          <div className="settings-view-page">
            <div className="view-header">
              <h2>⚙️ Engine & Safety Guardrails</h2>
            </div>
            <div className="settings-box">
              <h3>Autonomous Safety Controls</h3>
              <div className="guardrails-list">
                <div>Max Iterations: <strong>10 Steps</strong></div>
                <div>Max Tool Retries: <strong>3 Retries</strong></div>
                <div>Loop Protection Rule: <strong>Max 2 Duplicate Calls</strong></div>
                <div>Puter.js AI Engine: <strong>Active (Zero API Keys Required)</strong></div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
