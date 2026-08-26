import { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({ accounts: 0, keywords: 0, images: 0, schedules: 0 });
  const [botStatus, setBotStatus] = useState({ running: false });
  const [logs, setLogs] = useState([]);
  const [leadStats, setLeadStats] = useState({ total: 0, byScore: { high: 0, medium: 0, low: 0 }, newToday: 0 });
  const [campaigns, setCampaigns] = useState([]);
  const [analytics, setAnalytics] = useState({ totalComments: 0, commentsPerDay: {} });

  useEffect(() => {
    fetch('/api/accounts').then(r => r.json()).then(d => setStats(s => ({ ...s, accounts: d.length }))).catch(() => {});
    fetch('/api/keywords').then(r => r.json()).then(d => setStats(s => ({ ...s, keywords: d.length }))).catch(() => {});
    fetch('/api/images').then(r => r.json()).then(d => setStats(s => ({ ...s, images: d.length }))).catch(() => {});
    fetch('/api/scheduler').then(r => r.json()).then(d => setStats(s => ({ ...s, schedules: d.length }))).catch(() => {});
    fetch('/api/bot/status').then(r => r.json()).then(setBotStatus).catch(() => {});
    fetch('/api/bot/logs?limit=5').then(r => r.json()).then(setLogs).catch(() => {});
    fetch('/api/leads/stats').then(r => r.json()).then(setLeadStats).catch(() => {});
    fetch('/api/campaigns').then(r => r.json()).then(setCampaigns).catch(() => {});
    fetch('/api/analytics').then(r => r.json()).then(setAnalytics).catch(() => {});
  }, []);

  const cards = [
    { label: 'Total Leads', value: leadStats.total, color: '#22c55e', icon: '🎯' },
    { label: 'Hot Leads', value: leadStats.byScore?.high || 0, color: '#ef4444', icon: '🔥' },
    { label: 'Comments Posted', value: analytics.totalComments, color: '#6366f1', icon: '💬' },
    { label: 'Campaigns', value: campaigns.length, color: '#14b8a6', icon: '🚀' },
    { label: 'Keywords', value: stats.keywords, color: '#8b5cf6', icon: '🔑' },
    { label: 'Schedules', value: stats.schedules, color: '#ec4899', icon: '⏰' },
  ];

  return (
    <div className="page">
      <div className="stats-grid">
        {cards.map(c => (
          <div key={c.label} className="stat-card" style={{ borderLeftColor: c.color }}>
            <div className="stat-card-icon">{c.icon}</div>
            <div className="stat-card-body">
              <span className="stat-card-value">{c.value}</span>
              <span className="stat-card-label">{c.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h3>Bot Status</h3>
          </div>
          <div className="card-body">
            <div className="bot-status-indicator">
              <span className={`status-badge ${botStatus.running ? 'running' : 'stopped'}`}>
                {botStatus.running ? '● RUNNING' : '● STOPPED'}
              </span>
              {botStatus.running && <span className="pid">PID: {botStatus.pid}</span>}
            </div>
            <div className="bot-controls">
              <button
                className={`btn ${botStatus.running ? 'btn-danger' : 'btn-primary'}`}
                onClick={async () => {
                  const ep = botStatus.running ? '/api/bot/stop' : '/api/bot/start';
                  await fetch(ep, { method: 'POST' });
                  const status = await fetch('/api/bot/status').then(r => r.json());
                  setBotStatus(status);
                }}
              >
                {botStatus.running ? '⏹ Stop Bot' : '▶ Start Bot'}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Recent Activity</h3>
          </div>
          <div className="card-body">
            {logs.length === 0 ? (
              <p className="text-muted">No recent activity</p>
            ) : (
              <div className="mini-log-list">
                {logs.map((log, i) => (
                  <div key={i} className={`mini-log-entry ${log.level}`}>
                    <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="log-msg">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Lead Pipeline</h3></div>
          <div className="card-body">
            {leadStats.total > 0 ? (
              <div className="lead-pipeline">
                <div className="pipeline-bar">
                  <div className="pipeline-segment" style={{ flex: leadStats.byScore?.high || 1, background: '#22c55e' }} title={`Hot: ${leadStats.byScore?.high || 0}`} />
                  <div className="pipeline-segment" style={{ flex: leadStats.byScore?.medium || 1, background: '#f59e0b' }} title={`Warm: ${leadStats.byScore?.medium || 0}`} />
                  <div className="pipeline-segment" style={{ flex: leadStats.byScore?.low || 1, background: '#6b7280' }} title={`Cold: ${leadStats.byScore?.low || 0}`} />
                </div>
                <div className="pipeline-labels">
                  <span>🔥 Hot: {leadStats.byScore?.high || 0}</span>
                  <span>? Warm: {leadStats.byScore?.medium || 0}</span>
                  <span>? Cold: {leadStats.byScore?.low || 0}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted">No leads captured yet</p>
            )}
          </div>
        </div>
      </div>

      {campaigns.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header"><h3>Active Campaigns</h3></div>
          <div className="card-body">
            <div className="campaign-mini-grid">
              {campaigns.filter(c => c.status === 'active').slice(0, 4).map(c => (
                <div key={c.id} className="campaign-mini-card">
                  <div className="campaign-mini-name">{c.name}</div>
                  <div className="campaign-mini-stats">
                    <span>{c.leadsCount || 0} leads</span>
                    <span>{c.conversions || 0} conv</span>
                  </div>
                  {c.targetLeads > 0 && (
                    <div className="progress-bar" style={{ height: 6 }}>
                      <div className="progress-fill" style={{ width: `${Math.min(100, ((c.leadsCount || 0) / c.targetLeads) * 100)}%`, height: 6 }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {analytics.totalComments > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header"><h3>Comments Over Time</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={Object.entries(analytics.commentsPerDay || {}).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
