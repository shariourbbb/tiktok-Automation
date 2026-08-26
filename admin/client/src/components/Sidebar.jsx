import { NavLink } from 'react-router-dom';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/leads', label: 'Leads CRM', icon: '🎯' },
  { to: '/campaigns', label: 'Campaigns', icon: '🚀' },
  { to: '/accounts', label: 'Accounts', icon: '👤' },
  { to: '/keywords', label: 'Keywords', icon: '🔑' },
  { to: '/images', label: 'Images', icon: '🖼️' },
  { to: '/scheduler', label: 'Scheduler', icon: '⏰' },
  { to: '/logs', label: 'Activity Log', icon: '📋' },
  { to: '/ai-preview', label: 'AI Preview', icon: '🤖' },
  { to: '/analytics', label: 'Analytics', icon: '📈' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo">🤖</span>
        <span className="sidebar-title">TK Bot</span>
      </div>
      <nav className="sidebar-nav">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="sidebar-link-icon">{l.icon}</span>
            <span className="sidebar-link-label">{l.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className="sidebar-version">v1.0.0</span>
      </div>
    </aside>
  );
}
