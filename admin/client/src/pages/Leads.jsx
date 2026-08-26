import { useState, useEffect, useCallback } from 'react';

const STATUSES = ['new', 'contacted', 'followed', 'converted', 'ignored'];
const STATUS_COLORS = { new: '#6366f1', contacted: '#f59e0b', followed: '#14b8a6', converted: '#22c55e', ignored: '#6b7280' };

function ScoreBadge({ score }) {
  let color = '#6b7280';
  if (score >= 70) color = '#22c55e';
  else if (score >= 40) color = '#f59e0b';
  else if (score > 0) color = '#ef4444';
  return <span className="score-badge" style={{ background: color }}>{score}</span>;
}

function LeadDetailModal({ lead, onClose, onUpdate }) {
  const [notes, setNotes] = useState(lead.notes || '');
  const [status, setStatus] = useState(lead.status);

  const save = async () => {
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, status }),
    });
    onUpdate();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{lead.username}</h3>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        <div className="modal-body">
          <div className="lead-detail-grid">
            <div className="lead-detail-section">
              <h4>Profile</h4>
              <div className="lead-detail-row"><label>Platform</label><span>{lead.platform}</span></div>
              <div className="lead-detail-row"><label>Username</label><span>{lead.username}</span></div>
              <div className="lead-detail-row"><label>Profile</label><a href={lead.profileUrl} target="_blank" rel="noreferrer">View Profile</a></div>
              <div className="lead-detail-row"><label>Bio</label><span>{lead.bio || '-'}</span></div>
              <div className="lead-detail-row"><label>Verified</label><span>{lead.isVerified ? 'Yes' : 'No'}</span></div>
              <div className="lead-detail-row"><label>Private</label><span>{lead.isPrivate ? 'Yes' : 'No'}</span></div>
            </div>
            <div className="lead-detail-section">
              <h4>Metrics</h4>
              <div className="lead-detail-row"><label>Score</label><ScoreBadge score={lead.leadScore} /></div>
              <div className="lead-detail-row"><label>Followers</label><span>{lead.followers?.toLocaleString()}</span></div>
              <div className="lead-detail-row"><label>Following</label><span>{lead.following?.toLocaleString()}</span></div>
              <div className="lead-detail-row"><label>Total Likes</label><span>{lead.totalLikes?.toLocaleString()}</span></div>
              <div className="lead-detail-row"><label>Videos</label><span>{lead.videos}</span></div>
            </div>
            <div className="lead-detail-section">
              <h4>Source</h4>
              <div className="lead-detail-row"><label>Keyword</label><span>{lead.sourceKeyword || '-'}</span></div>
              <div className="lead-detail-row"><label>Video</label><a href={lead.sourceVideo} target="_blank" rel="noreferrer">View Video</a></div>
              <div className="lead-detail-row"><label>Discovered</label><span>{new Date(lead.discoveredAt).toLocaleString()}</span></div>
              <div className="lead-detail-row"><label>Last Interaction</label><span>{new Date(lead.lastInteractionAt).toLocaleString()}</span></div>
            </div>
          </div>
          <div className="lead-detail-section" style={{ marginTop: 16 }}>
            <h4>Status & Tags</h4>
            <div className="form-row">
              <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
              <span className="lead-tags">
                {(lead.tags || []).map(t => <span key={t} className="tag">{t}</span>)}
              </span>
            </div>
          </div>
          <div className="lead-detail-section">
            <h4>Notes</h4>
            <textarea className="input lead-notes-input" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="lead-detail-section">
            <h4>Interaction History ({lead.interactions?.length || 0})</h4>
            <div className="interaction-list">
              {(lead.interactions || []).slice(-10).reverse().map((int, i) => (
                <div key={i} className="interaction-item">
                  <span className="interaction-type">{int.type}</span>
                  <span className="interaction-time">{new Date(int.timestamp).toLocaleString()}</span>
                  <span className="interaction-content">{int.content || ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ total: 0, byScore: { high: 0, medium: 0, low: 0 }, avgScore: 0, newToday: 0 });
  const [selectedLead, setSelectedLead] = useState(null);
  const [filters, setFilters] = useState({ status: '', platform: '', search: '', sortBy: 'leadScore', sortOrder: 'desc' });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [campaigns, setCampaigns] = useState([]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    const [leadsData, statsData, campaignsData] = await Promise.all([
      fetch(`/api/leads?${params}`).then(r => r.json()),
      fetch('/api/leads/stats').then(r => r.json()),
      fetch('/api/campaigns').then(r => r.json()),
    ]);
    setLeads(leadsData);
    setStats(statsData);
    setCampaigns(campaignsData);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  };

  const bulkAction = async (action, data) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await fetch('/api/leads/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ids, data }),
    });
    setSelectedIds(new Set());
    load();
  };

  const exportLeads = async (format) => {
    const params = new URLSearchParams({ format });
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    const res = await fetch(`/api/leads/export?${params}`);
    if (format === 'csv') {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'leads.csv'; a.click();
      URL.revokeObjectURL(url);
    } else {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'leads.json'; a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Lead Management</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => exportLeads('csv')}>Export CSV</button>
          <button className="btn btn-secondary" onClick={() => exportLeads('json')}>Export JSON</button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card" style={{ borderLeftColor: '#6366f1' }}>
          <div className="stat-card-icon">🎯</div>
          <div className="stat-card-body">
            <span className="stat-card-value">{stats.total}</span>
            <span className="stat-card-label">Total Leads</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#22c55e' }}>
          <div className="stat-card-icon">🔥</div>
          <div className="stat-card-body">
            <span className="stat-card-value">{stats.byScore?.high || 0}</span>
            <span className="stat-card-label">Hot Leads (70+)</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="stat-card-icon">📊</div>
          <div className="stat-card-body">
            <span className="stat-card-value">{stats.avgScore}</span>
            <span className="stat-card-label">Avg Score</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#14b8a6' }}>
          <div className="stat-card-icon">🆕</div>
          <div className="stat-card-body">
            <span className="stat-card-value">{stats.newToday}</span>
            <span className="stat-card-label">New Today</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="filters-row">
            <input
              className="input" placeholder="Search leads..." value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            />
            <select className="input" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <select className="input" value={filters.platform} onChange={e => setFilters(f => ({ ...f, platform: e.target.value }))}>
              <option value="">All Platforms</option>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
            </select>
            <select className="input" value={filters.sortBy} onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value }))}>
              <option value="leadScore">Sort: Score</option>
              <option value="followers">Sort: Followers</option>
              <option value="discoveredAt">Sort: Date</option>
              <option value="username">Sort: Username</option>
            </select>
          </div>
          {selectedIds.size > 0 && (
            <div className="bulk-actions">
              <span className="text-muted">{selectedIds.size} selected</span>
              <button className="btn btn-sm btn-secondary" onClick={() => bulkAction('update', { status: 'contacted' })}>Mark Contacted</button>
              <button className="btn btn-sm btn-secondary" onClick={() => bulkAction('update', { status: 'followed' })}>Mark Followed</button>
              <button className="btn btn-sm btn-secondary" onClick={() => bulkAction('update', { status: 'converted' })}>Mark Converted</button>
              <button className="btn btn-sm btn-danger" onClick={() => { if (confirm('Delete selected leads?')) bulkAction('delete'); }}>Delete</button>
            </div>
          )}
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={selectedIds.size === leads.length && leads.length > 0} onChange={selectAll} /></th>
                <th>Score</th>
                <th>Username</th>
                <th>Platform</th>
                <th>Followers</th>
                <th>Following</th>
                <th>Status</th>
                <th>Keyword</th>
                <th>Discovered</th>
                <th>Tags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr><td colSpan={11} className="text-center text-muted">No leads yet. Run the bot to capture leads.</td></tr>
              ) : leads.map(l => (
                <tr key={l.id} className="clickable" onClick={() => setSelectedLead(l)}>
                  <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(l.id)} onChange={() => toggleSelect(l.id)} /></td>
                  <td><ScoreBadge score={l.leadScore} /></td>
                  <td><strong>{l.username}</strong></td>
                  <td><span className="badge badge-secondary">{l.platform}</span></td>
                  <td>{l.followers?.toLocaleString()}</td>
                  <td>{l.following?.toLocaleString()}</td>
                  <td><span className="badge" style={{ background: STATUS_COLORS[l.status] || '#6b7280' }}>{l.status}</span></td>
                  <td><span className="keyword-tag">{l.sourceKeyword || '-'}</span></td>
                  <td>{new Date(l.discoveredAt).toLocaleDateString()}</td>
                  <td>{(l.tags || []).map(t => <span key={t} className="tag tag-sm">{t}</span>)}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn btn-sm btn-primary" onClick={() => setSelectedLead(l)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLead && (
        <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={load} />
      )}
    </div>
  );
}
