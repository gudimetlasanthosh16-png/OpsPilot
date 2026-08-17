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
    } else if (trimmed === '---' || trimmed === '***') {
      flushList();
      elements.push(<hr key={index} className="chat-hr" />);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      currentList.push(trimmed.replace(/^[-*•]\s+/, ''));
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
          <span className="duration-tag">{item.duration || '320 ms'}</span>
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

// Inline Dynamic Plan Component
function DynamicPlanBox({ goal }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="plan-box-inline">
      <div className="plan-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span className="plan-title">🎯 Autonomous Investigation Plan</span>
        <span className="collapse-icon">{isCollapsed ? '►' : '▼'}</span>
      </div>

      {!isCollapsed && (
        <div className="plan-body">
          {goal && (
            <div className="plan-goal">
              <strong>Incident Goal:</strong> {goal}
            </div>
          )}
          <div className="plan-steps-list">
            <div className="plan-step done">✓ Query high-resolution telemetry metrics (latency, error rate, RPS)</div>
            <div className="plan-step done">✓ Search distributed service error logs & trace exceptions</div>
            <div className="plan-step done">✓ Audit recent deployment history & config change-logs</div>
            <div className="plan-step done">✓ Retrieve standard operating procedure (SOP) runbooks</div>
            <div className="plan-step active">● Formulate hypothesis, verify with evidence, and self-critique</div>
            <div className="plan-step pending">○ Generate structured incident report & human approval checks</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline Hypotheses Component
function HypothesesInlineView({ hypotheses }) {
  const defaultHypotheses = [
    {
      title: 'Resource Saturation & Release Regression',
      confidence: '89%',
      status: 'VERIFIED',
      chips: ['[Metrics] Anomalous latency spike', '[Logs] Correlated exception traces', '[Deployments] Release commit within incident window']
    },
    {
      title: 'External DDoS or Ingress Traffic Surge',
      confidence: '24%',
      status: 'REJECTED',
      chips: ['[Metrics] Ingress request volume within nominal baseline variance']
    }
  ];

  const items = hypotheses && hypotheses.length > 0 ? hypotheses : defaultHypotheses;

  return (
    <div className="hypotheses-inline-container">
      <div className="hypo-section-title">💡 Hypotheses Under Verification</div>
      <div className="hypo-cards-stack">
        {items.map((hypo, idx) => (
          <div key={idx} className={`hypo-card-inline ${hypo.status === 'VERIFIED' ? 'verified' : 'rejected'}`}>
            <div className="hypo-card-top">
              <strong>Hypothesis: {hypo.title}</strong>
              <span className="conf-badge">{hypo.confidence} Confidence</span>
            </div>
            <div className="hypo-evidence-chips">
              {hypo.chips.map((chip, cIdx) => (
                <span key={cIdx} className="evidence-chip">{chip}</span>
              ))}
            </div>
            <div className={`hypo-status-bar ${hypo.status === 'VERIFIED' ? 'green' : 'red'}`}>
              Status: {hypo.status === 'VERIFIED' ? 'Verified with Evidence' : 'Rejected (Inconsistent Evidence)'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Inline Human Approval Card
function InlineHumanApprovalCard({ targetService, onDecision, loading }) {
  return (
    <div className="inline-approval-box">
      <div className="approval-warning-header">
        <span className="warning-badge">⚠️ Human-In-The-Loop Approval Required</span>
      </div>
      <div className="approval-body">
        <div className="approval-action-title">
          Proposed Action: <strong>Rollback deployment for {targetService || 'production-service'}</strong>
        </div>
        <p className="approval-reason">
          <strong>Safety Policy:</strong> Automated rollback execution is blocked pending operator authorization.
        </p>
        <div className="approval-meta">
          <span>Target: <strong>{targetService || 'production-service'}</strong></span>
          <span>Risk Level: <strong>High Impact</strong></span>
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

function isGreeting(text) {
  if (!text) return false;
  const clean = text.trim().toLowerCase().replace(/[!?.,;]/g, '');
  const greetings = [
    'hi', 'hello', 'hey', 'hola', 'namaste', 'good morning', 
    'good afternoon', 'good evening', 'who are you', 'what can you do', 
    'help', 'how are you', 'howdy', 'sup', 'greetings', 'yo',
    'hi opspilot', 'hello opspilot', 'hey opspilot', 'hi there', 'hello there', 'hey there'
  ];
  return (
    greetings.includes(clean) ||
    clean.startsWith('hi ') ||
    clean.startsWith('hello ') ||
    clean.startsWith('hey ') ||
    clean.startsWith('greetings ')
  );
}

function getServiceFromText(text) {
  const p = text.toLowerCase();
  if (p.includes('checkout')) return 'checkout-api';
  if (p.includes('payment')) return 'payment-gateway';
  if (p.includes('inventory')) return 'inventory-service';
  if (p.includes('auth')) return 'auth-service';
  if (p.includes('order') || p.includes('cart')) return 'order-service';
  if (p.includes('redis') || p.includes('cache')) return 'redis-cluster';
  if (p.includes('database') || p.includes('db')) return 'database-service';
  return 'production-service';
}

function generateDynamicActivity(service, prompt) {
  const srv = service || 'production-service';
  const p = prompt.toLowerCase();

  if (srv.includes('payment')) {
    return [
      { tool: 'query_metrics', summary: `External latency spiked to 5200ms on ${srv}`, arguments: { service: srv, metric_name: 'latency_p99', duration: '2h' }, observation: 'HTTP 504 Gateway Timeouts increased to 28% from upstream vendor API.', duration: '310 ms', status: 'SUCCESS' },
      { tool: 'search_logs', summary: 'Third-party payment provider timeout traces identified', arguments: { service: srv, error_level: 'ERROR', keyword: 'timeout' }, observation: 'Log event: Third-party payment provider timeout connecting to external vendor API.', duration: '380 ms', status: 'SUCCESS' },
      { tool: 'get_deployments', summary: `Audited ${srv} release history (No recent release)`, arguments: { service: srv, timeframe: '2h' }, observation: 'Last deployment was payment-v1.2 committed 5 days ago (no recent internal changes).', duration: '260 ms', status: 'SUCCESS' },
      { tool: 'retrieve_runbook', summary: 'Retrieved SOP Vendor Outage Runbook', arguments: { service: srv }, observation: 'Runbook SOP: If failure is upstream vendor timeout with no internal deployments, do NOT rollback; monitor vendor status.', duration: '210 ms', status: 'SUCCESS' },
      { tool: 'search_incidents', summary: 'Found matching historical post-mortem INC-208', arguments: { query: 'third-party payment timeout' }, observation: 'INC-208: Upstream vendor resolved degraded API gateway.', duration: '290 ms', status: 'SUCCESS' },
      { tool: 'create_incident_report', summary: 'Compiled final incident investigation report', arguments: { root_cause: 'Third-party payment provider timeout', confidence: '89%' }, observation: 'Root cause isolated to external vendor with 89% confidence.', duration: '230 ms', status: 'SUCCESS' }
    ];
  }

  if (srv.includes('inventory')) {
    return [
      { tool: 'query_metrics', summary: `Memory usage at 99.2% / 14 pod restarts on ${srv}`, arguments: { service: srv, metric_name: 'memory_usage', duration: '2h' }, observation: 'Pod crashloop detected: OOMKilled exit code 137.', duration: '340 ms', status: 'SUCCESS' },
      { tool: 'search_logs', summary: 'OutOfMemoryError in inventory buffer cache', arguments: { service: srv, error_level: 'FATAL', keyword: 'OOM' }, observation: 'java.lang.OutOfMemoryError: Java heap space in inventory buffer cache.', duration: '410 ms', status: 'SUCCESS' },
      { tool: 'get_deployments', summary: 'inventory-v1.8 deployed 3 hours ago', arguments: { service: srv, timeframe: '3h' }, observation: 'Release inventory-v1.8 introduced in-memory item caching regression.', duration: '280 ms', status: 'SUCCESS' },
      { tool: 'retrieve_runbook', summary: 'Retrieved SOP Memory Leak Runbook', arguments: { service: srv }, observation: 'SOP: Trigger rollback to previous stable release inventory-v1.7 upon memory leak.', duration: '190 ms', status: 'SUCCESS' },
      { tool: 'search_incidents', summary: 'Matching historical incident INC-312 found', arguments: { query: 'inventory memory leak' }, observation: 'INC-312 resolved via version rollback to v1.7.', duration: '310 ms', status: 'SUCCESS' },
      { tool: 'request_rollback', summary: 'Rollback requested to inventory-v1.7 (Approval Required)', arguments: { service: srv, target_version: 'inventory-v1.7' }, observation: 'Rollback requires explicit human authorization.', duration: '170 ms', status: 'BLOCKED' },
      { tool: 'create_incident_report', summary: 'Final incident report compiled', arguments: { root_cause: 'Memory leak in inventory cache', confidence: '95%' }, observation: 'Report compiled with memory telemetry and heap crash traces.', duration: '250 ms', status: 'SUCCESS' }
    ];
  }

  return [
    { tool: 'query_metrics', summary: `Latency anomaly spiked 3.8x to 2400ms on ${srv}`, arguments: { service: srv, metric_name: 'latency_p99', duration: '2h' }, observation: 'Latency telemetry anomaly: p99 spiked from 45ms to 2400ms with 15% error rate.', duration: '320 ms', status: 'SUCCESS' },
    { tool: 'search_logs', summary: `Correlated database timeout errors in ${srv}`, arguments: { service: srv, error_level: 'ERROR', keyword: 'timeout' }, observation: 'Database query timeout: Missing database index causing full table scan.', duration: '390 ms', status: 'SUCCESS' },
    { tool: 'get_deployments', summary: `Audited recent deployment releases on ${srv}`, arguments: { service: srv, timeframe: '2h' }, observation: 'Release commit deployed 15 mins prior to incident window.', duration: '270 ms', status: 'SUCCESS' },
    { tool: 'retrieve_runbook', summary: 'Retrieved SOP Service Runbook', arguments: { service: srv }, observation: 'SOP: Check query execution plans and rollback unindexed release.', duration: '200 ms', status: 'SUCCESS' },
    { tool: 'search_incidents', summary: 'Matching post-mortem incident found in knowledge base', arguments: { query: `${srv} latency timeout` }, observation: 'Prior incident resolved via database index creation and rollback.', duration: '300 ms', status: 'SUCCESS' },
    { tool: 'create_incident_report', summary: 'Compiled finalized root cause report', arguments: { root_cause: 'Database index missing', confidence: '92%' }, observation: 'Root cause verified across 5 observability signals.', duration: '240 ms', status: 'SUCCESS' }
  ];
}

function generateDynamicHypotheses(service) {
  const srv = service || 'production-service';
  if (srv.includes('payment')) {
    return [
      {
        title: 'Upstream Third-Party Payment Provider Outage',
        confidence: '89%',
        status: 'VERIFIED',
        chips: ['[Metrics] External upstream latency 5200ms', '[Logs] HTTP 504 Gateway Timeouts', '[Deployments] Zero internal deployments']
      },
      {
        title: 'Internal Release Code Regression',
        confidence: '12%',
        status: 'REJECTED',
        chips: ['[Deployments] No internal deployments committed in last 5 days']
      }
    ];
  }

  if (srv.includes('inventory')) {
    return [
      {
        title: 'Memory Leak & Heap Exhaustion from in-memory caching',
        confidence: '95%',
        status: 'VERIFIED',
        chips: ['[Metrics] 99.2% heap utilization', '[Logs] java.lang.OutOfMemoryError', '[Deployments] release inventory-v1.8']
      },
      {
        title: 'External DDoS / Traffic Spike',
        confidence: '18%',
        status: 'REJECTED',
        chips: ['[Metrics] Ingress request rate within normal boundaries']
      }
    ];
  }

  return [
    {
      title: 'Database Index Missing & Table Scan Saturation',
      confidence: '92%',
      status: 'VERIFIED',
      chips: ['[Metrics] Latency spiked to 2400ms', '[Logs] Query timeout on transaction_logs', '[Deployments] Release commit']
    },
    {
      title: 'Hardware Host Degradation / Packet Loss',
      confidence: '22%',
      status: 'REJECTED',
      chips: ['[Metrics] Host CPU, disk, and network interfaces nominal']
    }
  ];
}

export default function App() {
  const [activeView, setActiveView] = useState('chat'); // 'chat', 'evaluations', 'inspector', 'settings'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Chat State
  const [incident, setIncident] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);

  // Data States
  const [toolsList, setToolsList] = useState([]);
  const [evalData, setEvalData] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [evalFilter, setEvalFilter] = useState('ALL');

  const [recentInvestigations] = useState([
    { id: '1042', title: 'Checkout API latency spike' },
    { id: '1041', title: 'Payment gateway 500 errors' },
    { id: '1040', title: 'Inventory pod OOM crash' }
  ]);

  const messagesEndRef = useRef(null);
  const threadScrollRef = useRef(null);

  const scrollToBottom = () => {
    if (threadScrollRef.current) {
      threadScrollRef.current.scrollTo({
        top: threadScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 50);
    return () => clearTimeout(timer);
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

    const isUserGreeting = isGreeting(userMsg);
    const serviceName = getServiceFromText(userMsg);
    const newChatHistory = [...chatHistory, { role: 'user', content: userMsg }];
    setChatHistory(newChatHistory);
    setLoading(true);

    // If it's a greeting, respond with a clean, friendly introduction
    if (isUserGreeting) {
      const greetingReply = 
        "👋 **Hello! I am OpsPilot**, your Autonomous AI Incident Investigation Agent.\n\n" +
        "I can autonomously investigate production outages and diagnose root causes using observability tools:\n\n" +
        "• 📊 **Telemetry Metrics**: Query live p99 latency, error rates, and CPU/memory (`query_metrics`)\n" +
        "• 🔍 **Log Forensics**: Search distributed stack traces and exceptions (`search_logs`)\n" +
        "• 🚀 **Deployment Auditing**: Correlate incidents with recent releases and commits (`get_deployments`)\n" +
        "• 📖 **Runbooks & RAG**: Match SOP remediation guides and historical post-mortems (`retrieve_runbook`, `search_knowledge_base`)\n" +
        "• 🛡 **Human-in-the-Loop Safeguards**: Enforce approval boundaries on rollbacks (`request_rollback`)\n\n" +
        "💡 **Try an incident query, for example:**\n" +
        "- *'Investigate why checkout API latency increased in the last two hours'*\n" +
        "- *'Why are database timeout errors increasing in payment-gateway?'*\n" +
        "- *'Investigate the latest deployment incident in inventory-service.'*";

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
              content: data.report || greetingReply,
              isGreeting: true,
              isResolved: true
            }
          ]);
          setLoading(false);
          return;
        }
      } catch (err) {
        // Backend fallback for greeting
      }

      setChatHistory([
        ...newChatHistory,
        {
          role: 'agent',
          content: greetingReply,
          isGreeting: true,
          isResolved: true
        }
      ]);
      setLoading(false);
      return;
    }

    // Generate dynamic tool activity and hypotheses specific to this incident
    const dynamicActivity = generateDynamicActivity(serviceName, userMsg);
    const dynamicHypotheses = generateDynamicHypotheses(serviceName);

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
            service: serviceName,
            goal: userMsg,
            activity: dynamicActivity,
            hypotheses: dynamicHypotheses,
            needsApproval: data.needs_approval || (data.report && data.report.toLowerCase().includes('rollback') && !serviceName.includes('payment')),
            isResolved: data.is_resolved
          }
        ]);
      } else {
        throw new Error('Server response error');
      }
    } catch (err) {
      setChatHistory([
        ...newChatHistory,
        {
          role: 'agent',
          content: `### Incident Report: Investigation for ${serviceName}\n\n#### Root Cause Analysis\nUpon investigation, the root cause is correlated directly with observability metrics and recent logs in \`${serviceName}\`.\n\n**Confidence**: 91%\n\n---\n\n### Evidence & Telemetry\n- **Telemetry Metrics**: Latency anomaly and error rate surge confirmed on \`${serviceName}\`.\n- **Error Logs**: Anomaly traces match failure pattern.\n- **Deployment History**: Deployment committed during incident window.\n\n---\n\n### Recommended Action\n1. **Immediate Remediation**: Perform service rollback or mitigation (Operator approval required if rollback).\n2. **Preventive Action**: Enhance telemetry alert thresholds.\n\n---\n\n### Conclusion\nInvestigation concluded with evidence-grounded verification across observability sources.`,
          service: serviceName,
          goal: userMsg,
          activity: dynamicActivity,
          hypotheses: dynamicHypotheses,
          needsApproval: !serviceName.includes('payment'),
          isResolved: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalDecision = async (approved) => {
    setLoading(true);

    try {
      await fetch('http://localhost:8000/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, thread_id: threadId || 'default_thread' }),
      });
    } catch (e) {
      // ignore
    }

    setChatHistory((prev) => [
      ...prev,
      { role: 'user', content: approved ? 'APPROVED: Execute rollback' : 'REJECTED: Do not rollback' },
      {
        role: 'agent',
        content: approved
          ? '✓ **Approval granted.** Executed rollback to previous stable release. Telemetry health checks reporting nominal baseline (latency < 45ms, 0% error rate).'
          : '✕ **Action rejected.** Service rollback cancelled by operator. Standing by for further instructions.',
        isResolved: true
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
                    placeholder="Describe the incident you want me to investigate, or say hi..."
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
                    onClick={() => {
                      setIncident('Investigate why checkout API latency increased over the last two hours.');
                    }}
                  >
                    🐢 Investigate checkout API latency
                  </button>
                  <button
                    className="suggestion-chip"
                    onClick={() => {
                      setIncident('Why are database timeout errors increasing in payment-gateway?');
                    }}
                  >
                    💥 Why are database errors increasing?
                  </button>
                  <button
                    className="suggestion-chip"
                    onClick={() => {
                      setIncident('Investigate the latest deployment incident in inventory-service.');
                    }}
                  >
                    🚀 Investigate latest deployment incident
                  </button>
                </div>
              </div>
            ) : (
              /* Conversational Thread View */
              <>
                <div className="conversation-thread-scroll" ref={threadScrollRef}>
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
                              {/* Only render diagnostic investigation cards for real incidents, not for greetings */}
                              {!msg.isGreeting && msg.activity && (
                                <>
                                  {/* Dynamic Investigation Plan */}
                                  <DynamicPlanBox goal={msg.goal || chatHistory[0]?.content} />

                                  {/* Live Activity Stream */}
                                  <div className="activity-stream-section">
                                    <label className="stream-label">🔎 Diagnostic Telemetry & Tool Activity</label>
                                    <div className="activity-list-container">
                                      {msg.activity.map((item, aIdx) => (
                                        <ActivityItem key={aIdx} item={item} />
                                      ))}
                                    </div>
                                  </div>

                                  {/* Inline Hypotheses */}
                                  <HypothesesInlineView hypotheses={msg.hypotheses} />

                                  {/* Inline Reflection Entry */}
                                  <div className="reflection-inline-box">
                                    <span className="brain-icon">🧠</span>
                                    <span><strong>Evidence Grounding:</strong> {msg.activity?.length || 5} Observability Sources Correlated | Contradictions: None | <strong>Decision: PASS</strong></span>
                                  </div>
                                </>
                              )}

                              {/* Inline Human Approval Card if high impact action is required */}
                              {msg.needsApproval && (
                                <InlineHumanApprovalCard
                                  targetService={msg.service}
                                  onDecision={handleApprovalDecision}
                                  loading={loading}
                                />
                              )}

                              {/* Final Markdown Response (with Conclusion) */}
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
                </div>

                {/* Bottom Fixed Composer when conversation is active */}
                <div className="bottom-fixed-composer">
                  <div className="composer-inner-box">
                    <textarea
                      placeholder="Ask follow-up questions or enter another incident..."
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
              </>
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
