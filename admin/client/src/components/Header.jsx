import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export default function Header() {
  const { connected, socket } = useSocket();
  const [botRunning, setBotRunning] = useState(false);

  useEffect(() => {
    fetch('/api/bot/status').then(r => r.json()).then(d => setBotRunning(d.running)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (d) => setBotRunning(d.running);
    socket.on('bot:status', handler);
    return () => socket.off('bot:status', handler);
  }, [socket]);

  const toggleBot = async () => {
    try {
      if (botRunning) {
        await fetch('/api/bot/stop', { method: 'POST' });
      } else {
        await fetch('/api/bot/start', { method: 'POST' });
      }
      const status = await fetch('/api/bot/status').then(r => r.json());
      setBotRunning(status.running);
    } catch {}
  };

  return (
    <header className="header">
      <h1 className="header-title">Admin Panel</h1>
      <div className="header-actions">
        <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot" />
          {connected ? 'Connected' : 'Disconnected'}
        </div>
        <button
          className={`bot-toggle-btn ${botRunning ? 'running' : ''}`}
          onClick={toggleBot}
        >
          {botRunning ? '⏹ Stop Bot' : '▶ Start Bot'}
        </button>
      </div>
    </header>
  );
}
