import React from 'react';
import { Link } from 'react-router-dom';
import './Layout.css';

function Layout({ children }) {
  return (
    <div className="layout">
      <nav className="sidebar">
        <ul>
          <li>Editing</li>
          <li><Link to="/videos">Videos</Link></li>
          <li><Link to="/clipmaker">Clip Maker</Link></li>
          <li><Link to="/studio">Studio</Link></li>
          <li>Settings</li>
          <li><Link to="/hotkeys">Hotkey Config</Link></li>
        </ul>
      </nav>
      <main className="content">
        {children}
      </main>
    </div>
  );
}

export default Layout;
