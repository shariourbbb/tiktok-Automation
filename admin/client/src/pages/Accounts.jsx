import { useState, useEffect } from 'react';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: '', username: '', proxy: '' });

  const load = () => fetch('/api/accounts').then(r => r.json()).then(setAccounts).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false);
    setForm({ id: '', username: '', proxy: '' });
    load();
  };

  const remove = async (id) => {
    if (!confirm('Delete this account?')) return;
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Account Management</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Account</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Account</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={create}>
              <div className="form-group">
                <label>Account ID</label>
                <input value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} placeholder="user_1" required />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="@username" required />
              </div>
              <div className="form-group">
                <label>Proxy (optional)</label>
                <input value={form.proxy} onChange={e => setForm(f => ({ ...f, proxy: e.target.value }))} placeholder="http://proxy:port" />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
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
                <th>ID</th>
                <th>Username</th>
                <th>Proxy</th>
                <th>Status</th>
                <th>Session</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted">No accounts yet</td></tr>
              ) : accounts.map(a => (
                <tr key={a.id}>
                  <td><code>{a.id}</code></td>
                  <td>{a.username}</td>
                  <td>{a.proxy || '-'}</td>
                  <td><span className={`badge ${a.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{a.status}</span></td>
                  <td><span className={`badge ${a.sessionExists ? 'badge-success' : 'badge-secondary'}`}>{a.sessionExists ? 'Yes' : 'No'}</span></td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(a.id)}>Delete</button>
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
