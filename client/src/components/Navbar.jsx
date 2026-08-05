import React from 'react';
import { Bell, ShieldCheck, Cpu, User } from 'lucide-react';
import DatasetSelector from './DatasetSelector';

const Navbar = () => {
  return (
    <nav style={{
      height: '70px',
      borderBottom: '1px solid var(--border-color)',
      background: 'rgba(11, 15, 25, 0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          background: 'var(--gradient-primary)',
          padding: '0.5rem',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Cpu size={22} color="#fff" />
        </div>
        <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
          Quali<span className="text-gradient">AI</span>
        </span>
        <span style={{
          background: 'rgba(99, 102, 241, 0.15)',
          color: 'var(--accent-primary)',
          fontSize: '0.75rem',
          padding: '0.2rem 0.6rem',
          borderRadius: '20px',
          fontWeight: 600,
          border: '1px solid rgba(99, 102, 241, 0.3)'
        }}>
          v1.0 ML Engine
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <DatasetSelector />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: 'var(--accent-emerald)',
          background: 'rgba(16, 185, 129, 0.1)',
          padding: '0.4rem 0.8rem',
          borderRadius: '20px',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}>
          <ShieldCheck size={16} />
          System Operational
        </div>


        <button style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '0.5rem',
          borderRadius: '50%'
        }}>
          <Bell size={20} />
        </button>

        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'var(--gradient-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}>
          <User size={18} color="#fff" />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
