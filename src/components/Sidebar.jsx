import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  UploadCloud, 
  LayoutDashboard, 
  CheckCircle2, 
  AlertTriangle, 
  Award, 
  Sparkles, 
  FileText 
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/upload', label: 'Upload Dataset', icon: UploadCloud },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/validation', label: 'Validation', icon: CheckCircle2 },
  { path: '/anomaly', label: 'Anomaly Detection', icon: AlertTriangle },
  { path: '/quality', label: 'Quality Score', icon: Award },
  { path: '/ai-explanation', label: 'AI Explanation', icon: Sparkles },
  { path: '/reports', label: 'Reports & Export', icon: FileText },
];

const Sidebar = () => {
  return (
    <aside style={{
      width: '260px',
      borderRight: '1px solid var(--border-color)',
      background: 'var(--bg-surface)',
      padding: '1.5rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      minHeight: 'calc(100vh - 70px)'
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', padding: '0 0.75rem 0.5rem' }}>
        Core Engine
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              color: isActive ? '#ffffff' : 'var(--text-muted)',
              background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
              fontWeight: isActive ? 600 : 400,
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            })}
          >
            <Icon size={18} color="var(--accent-primary)" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </aside>
  );
};

export default Sidebar;
