import { useState, useEffect } from 'react';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', platforms: ['tiktok'], keywords: [], accounts: [], targetLeads: 0,
  });
  const [editingId, setEditingId] = useState(null);

  const load = () => fetch('/api/campaigns').then(r => r.json()).then(setCampaigns).catch(() => {});
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', description: '', platforms: ['tiktok'], keywords: [], accounts: [], targetLeads: 0 });
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({
      name: c.name, description: c.description || '',
      platforms: c.platforms || ['tiktok'],
      keywords: c.keywords || [], accounts: c.accounts || [],
      targetLeads: c.targetLeads || 0,
    });
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const url = editingId ? `/api/campaigns/${editingId}` : '/api/campaigns';
    const method = editingId ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false);
    load();
  };

  const remove = async (id) => {
    if (!confirm('Delete this campaign?')) return;
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    load();
  };

  const platformOptions = ['tiktok', 'instagram', 'youtube'];

  return (
    <div className="page">
      <div className="page-header">
        <h2>Campaign Management</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ New Campaign</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Campaign' : 'New Campaign'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>x</button>
            </div>
            <form onSubmit={save}>
              <div className="form-group">
                <label>Campaign Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dance Niche Q1" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="form-group">
                <label>Platforms</label>
                <div className="checkbox-group">
                  {platformOptions.map(p => (
                    <label key={p} className="checkbox-label">
                      <input type="checkbox" checked={form.platforms.includes(p)}
                        onChange={e => setForm(f => ({
                          ...f,
                          platforms: e.target.checked
                            ? [...f.platforms, p]
                            : f.platforms.filter(x => x !== p),
                        }))}
                      /> {p.charAt(0).toUpperCase() + p.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Keywords (comma separated)</label>
                <input value={form.keywords.join(', ')} onChange={e => setForm(f => ({ ...f, keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="#dance, #viral" />
              </div>
              <div className="form-group">
                <label>Accounts (comma separated)</label>
                <input value={form.accounts.join(', ')} onChange={e => setForm(f => ({ ...f, accounts: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="user_1, user_2" />
              </div>
              <div className="form-group">
                <label>Target Leads</label>
                <input type="number" value={form.targetLeads} onChange={e => setForm(f => ({ ...f, targetLeads: parseInt(e.target.value) || 0 }))} min={0} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card" style={{ borderLeftColor: '#6366f1' }}>
          <div className="stat-card-icon">🚀</div>
          <div className="stat-card-body">
            <span className="stat-card-value">{campaigns.length}</span>
            <span className="stat-card-label">Total Campaigns</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#22c55e' }}>
          <div className="stat-card-icon">✅</div>
          <div className="stat-card-body">
            <span className="stat-card-value">{campaigns.reduce((s, c) => s + (c.conversions || 0), 0)}</span>
            <span className="stat-card-label">Total Conversions</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#14b8a6' }}>
          <div className="stat-card-icon">🎯</div>
          <div className="stat-card-body">
            <span className="stat-card-value">{campaigns.reduce((s, c) => s + (c.leadsCount || 0), 0)}</span>
            <span className="stat-card-label">Total Campaign Leads</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Platforms</th>
                <th>Keywords</th>
                <th>Leads</th>
                <th>Conversions</th>
                <th>Target</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr><td colSpan={10} className="text-center text-muted">No campaigns yet</td></tr>
              ) : campaigns.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{(c.platforms || []).map(p => <span key={p} className="badge badge-secondary" style={{ marginRight: 4 }}>{p}</span>)}</td>
                  <td>{(c.keywords || []).join(', ') || '-'}</td>
                  <td>{c.leadsCount || 0}</td>
                  <td>{c.conversions || 0}</td>
                  <td>{c.targetLeads || '-'}</td>
                  <td>
                    {c.targetLeads > 0 ? (
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${Math.min(100, ((c.leadsCount || 0) / c.targetLeads) * 100)}%` }} />
                        <span className="progress-text">{Math.round(((c.leadsCount || 0) / c.targetLeads) * 100)}%</span>
                      </div>
                    ) : '-'}
                  </td>
                  <td><span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>{c.status}</span></td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-sm btn-secondary" style={{ marginRight: 4 }} onClick={() => openEdit(c)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(c.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
