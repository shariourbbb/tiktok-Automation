import { Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Keywords from './pages/Keywords';
import Images from './pages/Images';
import Logs from './pages/Logs';
import Scheduler from './pages/Scheduler';
import AIPreview from './pages/AIPreview';
import Analytics from './pages/Analytics';
import Leads from './pages/Leads';
import Campaigns from './pages/Campaigns';

export default function App() {
  return (
    <SocketProvider>
      <div className="app-layout">
        <Sidebar />
        <div className="main-area">
          <Header />
          <div className="content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/keywords" element={<Keywords />} />
              <Route path="/images" element={<Images />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/scheduler" element={<Scheduler />} />
              <Route path="/ai-preview" element={<AIPreview />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/campaigns" element={<Campaigns />} />
            </Routes>
          </div>
        </div>
      </div>
    </SocketProvider>
  );
}
