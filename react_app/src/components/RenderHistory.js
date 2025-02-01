import React, { useState } from 'react';
import './RenderHistory.css';

export const RenderHistory = ({ 
  renders, 
  onRefresh, 
  isRefreshing 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`render-history ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="render-history-header">
        <div className="header-left">
          <h3>Render History</h3>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="collapse-button"
          >
            {isCollapsed ? '▼' : '▲'}
          </button>
        </div>
        <button 
          onClick={onRefresh}
          disabled={isRefreshing}
          className="refresh-button"
        >
          {isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {!isCollapsed && (
        <table className="render-history-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Filename</th>
              <th>Size</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {renders
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .map((render, index) => (
                <tr key={index}>
                  <td>{new Date(render.timestamp).toLocaleString()}</td>
                  <td>{render.filename}</td>
                  <td>{render.size ? `${(render.size / 1024 / 1024).toFixed(2)} MB` : '-'}</td>
                  <td>
                    <span className={`status-${render.status.toLowerCase()}`}>
                      {render.status}
                    </span>
                  </td>
                  <td>
                    {render.b2_url && (
                      <a 
                        href={render.b2_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="download-link"
                      >
                        Download
                      </a>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
}; 