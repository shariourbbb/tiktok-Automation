import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const bottomRef = useRef(null);
  const { socket } = useSocket();

  useEffect(() => {
    fetch('/api/bot/logs?limit=500').then(r => r.json()).then(setLogs).catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (entry) => {
      setLogs(prev => {
        const next = [...prev, entry];
        if (next.length > 1000) next.splice(0, next.length - 1000);
        return next;
      });
    };
    socket.on('bot:log', handler);
    return () => socket.off('bot:log', handler);
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const clearLogs = async () => {
    await fetch('/api/bot/logs', { method: 'DELETE' });
    setLogs([]);
  };

  const filtered = filter === 'all' ? logs : logs.filter(l => l.level === filter);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Activity Log</h2>
        <div className="log-controls">
          <select className="input" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
          </select>
          <button className="btn btn-secondary" onClick={clearLogs}>Clear Logs</button>
        </div>
      </div>

      <div className="log-container">
        {filtered.length === 0 ? (
          <div className="log-empty">No log entries yet</div>
        ) : (
          filtered.map((log, i) => (
            <div key={i} className={`log-entry ${log.level}`}>
              <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <span className={`log-level ${log.level}`}>{log.level.toUpperCase()}</span>
              <span className="log-msg">{log.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
