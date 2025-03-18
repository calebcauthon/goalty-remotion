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
          <li><Link to="/player-tracking">Player Tracking</Link></li>
          <li>Settings</li>
          <li><Link to="/hotkeys">Hotkey Config</Link></li>
          <li><Link to="/stats">Stats & Reports</Link></li>
          <li><Link to="/homography">Homography</Link></li>
          <li><Link to="/cv-datasets">CV Datasets</Link></li>
          <li><Link to="/b2-files">B2 Storage Files</Link></li>
        </ul>
      </nav>
      <main className="content">
        {children}
      </main>
    </div>
  );
}

export default Layout;
