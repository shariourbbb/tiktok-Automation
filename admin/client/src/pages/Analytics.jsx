import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Analytics() {
  const [data, setData] = useState({ totalComments: 0, commentsPerDay: {}, accounts: {} });

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(setData).catch(() => {});
  }, []);

  const dailyData = Object.entries(data.commentsPerDay || {}).map(([date, count]) => ({ date, count }));
  dailyData.sort((a, b) => a.date.localeCompare(b.date));

  const accountData = Object.entries(data.accounts || {}).map(([id, info]) => ({
    name: id,
    comments: info.comments || 0,
  }));

  return (
    <div className="page">
      <div className="page-header">
        <h2>Analytics</h2>
        <button className="btn btn-secondary" onClick={async () => {
          await fetch('/api/analytics', { method: 'DELETE' });
          setData({ totalComments: 0, commentsPerDay: {}, accounts: {} });
        }}>Reset Data</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ borderLeftColor: '#6366f1' }}>
          <div className="stat-card-icon">💬</div>
          <div className="stat-card-body">
            <span className="stat-card-value">{data.totalComments}</span>
            <span className="stat-card-label">Total Comments</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#14b8a6' }}>
          <div className="stat-card-icon">📅</div>
          <div className="stat-card-body">
            <span className="stat-card-value">{dailyData.length}</span>
            <span className="stat-card-label">Active Days</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="stat-card-icon">👤</div>
          <div className="stat-card-body">
            <span className="stat-card-value">{accountData.length}</span>
            <span className="stat-card-label">Active Accounts</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {dailyData.length > 0 && (
          <div className="card">
            <div className="card-header"><h3>Comments Per Day</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#6b7280" />
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {accountData.length > 0 && (
          <div className="card">
            <div className="card-header"><h3>Comments by Account</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={accountData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" />
                  <XAxis type="number" stroke="#6b7280" />
                  <YAxis dataKey="name" type="category" stroke="#6b7280" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }} />
                  <Bar dataKey="comments" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {dailyData.length > 1 && (
          <div className="card">
            <div className="card-header"><h3>Trend</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#6b7280" />
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="count" stroke="#ec4899" strokeWidth={2} dot={{ fill: '#ec4899' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {dailyData.length === 0 && (
          <div className="card">
            <div className="card-body text-center text-muted">
              <p>No analytics data yet. Start the bot to collect data.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
