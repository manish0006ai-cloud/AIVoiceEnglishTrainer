import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Header({ onOpenSettings }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isProgress = location.pathname === '/progress';

  return (
    <header className="header">
      <div className="header-brand" onClick={() => navigate('/')}>
        <span className="logo">🎙</span>
        <h1>AI Voice English Trainer</h1>
      </div>
      <nav className="header-nav">
        <button
          className={`header-btn ${isHome ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          <span className="icon">🏠</span> Home
        </button>
        <button
          className={`header-btn ${isProgress ? 'active' : ''}`}
          onClick={() => navigate('/progress')}
        >
          <span className="icon">📊</span> Progress
        </button>
        <button className="header-btn" onClick={onOpenSettings}>
          <span className="icon">⚙️</span> Settings
        </button>
      </nav>
    </header>
  );
}
