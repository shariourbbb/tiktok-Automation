import { useState, useEffect } from 'react';

export default function Scheduler() {
  const [schedules, setSchedules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', cron: '', keywords: [], accounts: [], enabled: true });

  const load = () => fetch('/api/scheduler').then(r => r.json()).then(setSchedules).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await fetch('/api/scheduler', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false);
    setForm({ name: '', cron: '', keywords: [], accounts: [], enabled: true });
    load();
  };

  const toggle = async (id) => {
    await fetch(`/api/scheduler/${id}/toggle`, { method: 'POST' });
    load();
  };

  const remove = async (id) => {
    if (!confirm('Delete this schedule?')) return;
    await fetch(`/api/scheduler/${id}`, { method: 'DELETE' });
    load();
  };

  const cronExamples = [
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every 6 hours', value: '0 */6 * * *' },
    { label: 'Daily at midnight', value: '0 0 * * *' },
    { label: 'Every 30 min', value: '*/30 * * * *' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h2>Scheduler</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Schedule</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Schedule</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={create}>
              <div className="form-group">
                <label>Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Daily run" required />
              </div>
              <div className="form-group">
                <label>Cron Expression</label>
                <input value={form.cron} onChange={e => setForm(f => ({ ...f, cron: e.target.value }))} placeholder="0 */6 * * *" required />
                <div className="cron-presets">
                  {cronExamples.map(ex => (
                    <button key={ex.value} type="button" className="btn btn-xs" onClick={() => setForm(f => ({ ...f, cron: ex.value }))}>
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Keywords (comma separated)</label>
                <input value={form.keywords.join(', ')} onChange={e => setForm(f => ({ ...f, keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="#viral, trending" />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Cron</th>
                <th>Keywords</th>
                <th>Status</th>
                <th>Last Run</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted">No schedules yet</td></tr>
              ) : schedules.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td><code>{s.cron}</code></td>
                  <td>{(s.keywords || []).join(', ') || '-'}</td>
                  <td>
                    <span className={`badge ${s.enabled ? 'badge-success' : 'badge-secondary'}`}>
                      {s.enabled ? 'Active' : 'Paused'}
                    </span>
                  </td>
                  <td>{s.lastRun ? new Date(s.lastRun).toLocaleString() : 'Never'}</td>
                  <td className="actions-cell">
                    <button className="btn btn-sm btn-secondary" onClick={() => toggle(s.id)}>
                      {s.enabled ? 'Pause' : 'Activate'}
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(s.id)}>Delete</button>
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
