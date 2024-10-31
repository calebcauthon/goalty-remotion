import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import './HotkeyConfig.css';

function HotkeyConfig() {
  const [hotkeyGroups, setHotkeyGroups] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:5000/api/hotkeys')
      .then(response => response.json())
      .then(data => setHotkeyGroups(data))
      .catch(err => setError('Failed to load hotkey configurations'));
  }, []);

  const handleAddNew = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/hotkeys/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'New Hotkey Group' }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        navigate(`/hotkeys/${data.id}`);
      }
    } catch (err) {
      setError('Failed to create new hotkey group');
    }
  };

  const renderShortcuts = (shortcuts) => {
    if (!shortcuts || Object.keys(shortcuts).length === 0) {
      return <em>No shortcuts configured</em>;
    }

    return (
      <ul className="shortcuts-list">
        {Object.entries(shortcuts).map(([key, shortcut]) => (
          <li key={key}>
            <span className="key">{key}</span> → 
            <span className="action">{shortcut.action}</span>
            {shortcut.description && (
              <span className="description">({shortcut.description})</span>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Layout>
      <div className="hotkey-config">
        <div className="header">
          <h1>Hotkey Configuration</h1>
          <button className="add-new-button" onClick={handleAddNew}>
            Add New Group
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="hotkey-groups">
          <table>
            <thead>
              <tr>
                <th>Group Name</th>
                <th>Shortcuts</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hotkeyGroups.map(group => (
                <tr key={group.id}>
                  <td className="group-name">{group.name}</td>
                  <td className="shortcuts-cell">
                    {renderShortcuts(group.shortcuts)}
                  </td>
                  <td className="actions-cell">
                    <button 
                      onClick={() => navigate(`/hotkeys/${group.id}`)}
                      className="primary-button"
                    >
                      View/Edit
                    </button>
                  </td>
                </tr>
              ))}
              {hotkeyGroups.length === 0 && (
                <tr>
                  <td colSpan="3" className="no-groups">
                    No hotkey groups configured. Click "Add New Group" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

export default HotkeyConfig; 