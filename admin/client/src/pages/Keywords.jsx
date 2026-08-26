import { useState, useEffect } from 'react';

export default function Keywords() {
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');

  const load = () => fetch('/api/keywords').then(r => r.json()).then(setKeywords).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    await fetch('/api/keywords', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword: newKeyword.trim() }) });
    setNewKeyword('');
    load();
  };

  const remove = async (kw) => {
    await fetch(`/api/keywords/${encodeURIComponent(kw)}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Keyword Management</h2>
      </div>

      <div className="card">
        <div className="card-header"><h3>Add Keyword</h3></div>
        <div className="card-body">
          <form className="inline-form" onSubmit={add}>
            <input
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              placeholder="e.g. #trending, funny pets, dance challenge"
              className="input"
            />
            <button type="submit" className="btn btn-primary">Add</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Keywords List</h3></div>
        <div className="card-body">
          {keywords.length === 0 ? (
            <p className="text-muted">No keywords yet</p>
          ) : (
            <div className="keyword-list">
              {keywords.map(kw => (
                <div key={kw} className="keyword-chip">
                  <span>{kw}</span>
                  <button className="chip-remove" onClick={() => remove(kw)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
