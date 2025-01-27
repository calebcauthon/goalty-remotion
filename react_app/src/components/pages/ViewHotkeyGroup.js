import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from './Layout';
import './ViewHotkeyGroup.css';
import { GlobalContext } from '../../index';

function ViewHotkeyGroup() {
  const globalData = useContext(GlobalContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [newKey, setNewKey] = useState('');
  const [showKeyOverlay, setShowKeyOverlay] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [editedAction, setEditedAction] = useState('');
  const [editingDescription, setEditingDescription] = useState(null);
  const [editedDescription, setEditedDescription] = useState('');
  const [instructions, setInstructions] = useState([]);
  const [newInstruction, setNewInstruction] = useState('');
  const [localInstructionNames, setLocalInstructionNames] = useState({});

  useEffect(() => {
    fetch(`${globalData.APIbaseUrl}/api/hotkeys/${id}`)
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          // Handle both old and new format
          var shortcuts = data.shortcuts;
          var instructions = data.instructions || [];
          if (shortcuts.shortcuts) {
            instructions = shortcuts.instructions;
            shortcuts = shortcuts.shortcuts;
          }
          
          // Ensure all instructions have the required format
          instructions = instructions.map(instruction => {
            if (typeof instruction === 'string') {
              return {
                id: Date.now() + Math.random(),
                name: 'No name yet',
                text: instruction
              };
            }
            if (!instruction.name) {
              return {
                ...instruction,
                name: 'No name yet'
              };
            }
            return instruction;
          });
          
          setGroup({ ...data, shortcuts });
          setInstructions(instructions);
        }
      })
      .catch(err => setError('Failed to load hotkey group'));
  }, [id]);

  useEffect(() => {
    if (showKeyOverlay) {
      window.addEventListener('keydown', handleKeyPress);
      
      // Cleanup function to remove event listener
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [showKeyOverlay]); // Only re-run when showKeyOverlay changes

  const handleSave = async () => {
    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/hotkeys/${id}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editedName }),
      });

      if (!response.ok) throw new Error('Failed to update name');

      setGroup({ ...group, name: editedName });
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update name');
    }
  };

  const startEditing = () => {
    setEditedName(group.name);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedName('');
  };

  const handleKeyEdit = (originalKey) => {
    setEditingKey(originalKey);
    setNewKey('');
    setShowKeyOverlay(true);
  };

  const handleKeyPress = (e) => {
    e.preventDefault();
    
    // Array to store key combination parts
    const keys = [];
    
    // Add modifier keys if they are pressed
    if (e.ctrlKey) keys.push('CTRL');
    if (e.shiftKey) keys.push('SHIFT');
    if (e.altKey) keys.push('ALT');
    
    // Add the main key if it's not a modifier key
    if (!['Control', 'Shift', 'Alt'].includes(e.key)) {
      keys.push(e.key);
    }
    
    // Combine all keys with '+'
    const keyCombo = keys.join('+');
    
    // Only set new key if we have a valid combination
    if (keyCombo) {
      setNewKey(keyCombo);
    }
  };

  const handleKeyUpdate = async () => {
    if (!newKey || !editingKey) return;

    try {
      const updatedShortcuts = { ...group.shortcuts };
      const action = updatedShortcuts[editingKey];
      delete updatedShortcuts[editingKey];
      updatedShortcuts[newKey] = action;

      const response = await fetch(`${globalData.APIbaseUrl}/api/hotkeys/${id}/update-shortcuts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shortcuts: updatedShortcuts,
          instructions: instructions
        }),
      });

      if (!response.ok) throw new Error('Failed to update shortcuts');

      setGroup({ ...group, shortcuts: updatedShortcuts });
      setShowKeyOverlay(false);
      setEditingKey(null);
      setNewKey('');
    } catch (err) {
      setError('Failed to update shortcuts');
    }
  };

  const handleActionEdit = (key, action) => {
    setEditingAction(key);
    setEditedAction(action);
  };

  const handleActionSave = async (key) => {
    if (!editedAction) return;

    try {
      const updatedShortcuts = { ...group.shortcuts };
      updatedShortcuts[key] = {
        ...updatedShortcuts[key],
        action: editedAction
      };

      const response = await fetch(`${globalData.APIbaseUrl}/api/hotkeys/${id}/update-shortcuts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shortcuts: updatedShortcuts,
          instructions: instructions
        }),
      });

      if (!response.ok) throw new Error('Failed to update shortcuts');

      setGroup({ ...group, shortcuts: updatedShortcuts });
      setEditingAction(null);
      setEditedAction('');
    } catch (err) {
      setError('Failed to update shortcuts');
    }
  };

  const handleActionCancel = () => {
    setEditingAction(null);
    setEditedAction('');
  };

  const handleDescriptionEdit = (key, description) => {
    setEditingDescription(key);
    setEditedDescription(description);
  };

  const handleDescriptionSave = async (key) => {
    if (!editedDescription) return;

    try {
      const updatedShortcuts = { ...group.shortcuts };
      updatedShortcuts[key] = {
        ...updatedShortcuts[key],
        description: editedDescription
      };

      const response = await fetch(`${globalData.APIbaseUrl}/api/hotkeys/${id}/update-shortcuts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shortcuts: updatedShortcuts,
          instructions: instructions
        }),
      });

      if (!response.ok) throw new Error('Failed to update shortcuts');

      setGroup({ ...group, shortcuts: updatedShortcuts });
      setEditingDescription(null);
      setEditedDescription('');
    } catch (err) {
      setError('Failed to update shortcuts');
    }
  };

  const handleAddHotkey = async () => {
    try {
      const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ,.;'.split('');
      const existingKeys = Object.keys(group.shortcuts);
      
      // Filter out already used keys
      const availableKeys = alphabet.filter(key => !existingKeys.includes(key));
      
      if (availableKeys.length === 0) {
        setError('No more available single letter keys!');
        return;
      }

      // Pick a random key from available keys
      const randomKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
      
      const updatedShortcuts = { ...group.shortcuts };
      updatedShortcuts[randomKey] = {
        action: 'console.log("New hotkey")',
        description: 'New hotkey description'
      };

      const response = await fetch(`${globalData.APIbaseUrl}/api/hotkeys/${id}/update-shortcuts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shortcuts: updatedShortcuts,
          instructions: instructions
        }),
      });

      if (!response.ok) throw new Error('Failed to add shortcut');

      setGroup({ ...group, shortcuts: updatedShortcuts });
    } catch (err) {
      setError('Failed to add shortcut');
    }
  };

  const handleDeleteHotkey = async (keyToDelete) => {
    try {
      const updatedShortcuts = { ...group.shortcuts };
      delete updatedShortcuts[keyToDelete];

      const response = await fetch(`${globalData.APIbaseUrl}/api/hotkeys/${id}/update-shortcuts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shortcuts: updatedShortcuts,
          instructions: instructions
        }),
      });

      if (!response.ok) throw new Error('Failed to delete shortcut');

      setGroup({ ...group, shortcuts: updatedShortcuts });
    } catch (err) {
      setError('Failed to delete shortcut');
    }
  };

  const handleAddInstruction = async () => {
    if (!newInstruction.trim()) return;

    try {
      const updatedInstructions = [...instructions, {
        id: Date.now(), // Add unique ID
        name: `Instruction ${instructions.length + 1}`, // Default name
        text: newInstruction
      }];
      
      const response = await fetch(`${globalData.APIbaseUrl}/api/hotkeys/${id}/update-shortcuts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shortcuts: group.shortcuts,
          instructions: updatedInstructions
        }),
      });

      if (!response.ok) throw new Error('Failed to add instruction');

      setInstructions(updatedInstructions);
      setNewInstruction('');
    } catch (err) {
      setError('Failed to add instruction');
    }
  };

  const handleInstructionNameChange = async (instructionId, newName) => {
    try {
      const updatedInstructions = instructions.map(instruction => 
        instruction.id === instructionId ? { ...instruction, name: newName } : instruction
      );

      const response = await fetch(`${globalData.APIbaseUrl}/api/hotkeys/${id}/update-shortcuts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shortcuts: group.shortcuts,
          instructions: updatedInstructions
        }),
      });

      if (!response.ok) throw new Error('Failed to update instruction name');

      setInstructions(updatedInstructions);
    } catch (err) {
      setError('Failed to update instruction name');
    }
  };

  const handleDeleteInstruction = async (id) => {
    try {
      const updatedInstructions = instructions.filter(instruction => instruction.id !== id);
      
      const response = await fetch(`${globalData.APIbaseUrl}/api/hotkeys/${id}/update-shortcuts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shortcuts: group.shortcuts,
          instructions: updatedInstructions
        }),
      });

      if (!response.ok) throw new Error('Failed to delete instruction');

      setInstructions(updatedInstructions);
    } catch (err) {
      setError('Failed to delete instruction');
    }
  };

  const handleLocalNameChange = (instructionId, newName) => {
    setLocalInstructionNames(prev => ({
      ...prev,
      [instructionId]: newName
    }));
  };

  if (error) return (
    <Layout>
      <div className="error-message">{error}</div>
    </Layout>
  );

  if (!group) return (
    <Layout>
      <div>Loading...</div>
    </Layout>
  );

  return (
    <Layout>
      <div className="view-hotkey-group">
        {isEditing ? (
          <div className="edit-title">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              autoFocus
            />
            <button onClick={handleSave} title="Save">💾</button>
            <button onClick={cancelEditing} title="Cancel">❌</button>
          </div>
        ) : (
          <h1>
            {group.name}
            <button onClick={startEditing} className="edit-button" title="Edit name">✏️</button>
          </h1>
        )}
        <div className="instructions-container">
          <h2>Dictation Instructions</h2>
          <div className="add-instruction">
            <textarea
              value={newInstruction}
              onChange={(e) => setNewInstruction(e.target.value)} 
              placeholder="Enter new instruction..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  //handleAddInstruction();
                }
              }}
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '12px',
                fontSize: '16px',
                lineHeight: '1.5',
                border: '2px solid #ccc',
                borderRadius: '4px',
                resize: 'vertical'
              }}
            />
            <button onClick={handleAddInstruction}>Add</button>
          </div>
          <ul className="instructions-list">
            {instructions.map((instruction) => (
              <li key={instruction.id}>
                <input
                  type="text"
                  value={localInstructionNames[instruction.id] ?? instruction.name}
                  onChange={(e) => handleLocalNameChange(instruction.id, e.target.value)}
                  onBlur={async () => {
                    const newName = localInstructionNames[instruction.id];
                    if (newName !== undefined && newName !== instruction.name) {
                      await handleInstructionNameChange(instruction.id, newName);
                    }
                  }}
                  className="instruction-name-input"
                />
                {instruction.text}
                <button 
                  onClick={() => handleDeleteInstruction(instruction.id)}
                  className="delete-button"
                  title="Delete instruction"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="shortcuts-container">
          <div className="shortcuts-header">
            <h2>Shortcuts</h2>
            <button 
              onClick={handleAddHotkey}
              className="add-hotkey-button"
              title="Add new hotkey"
            >
              Add Hotkey
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Key</th>
                <th>Action</th>
                <th>Description</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(group.shortcuts)
                .sort((a, b) => a[1].action.localeCompare(b[1].action))
                .map(([key, shortcut]) => (
                <tr key={key}>
                  <td className="key">
                    <button 
                      onClick={() => handleKeyEdit(key)}
                      className="edit-key-button"
                      title="Edit key"
                    >
                      ✏️
                    </button>
                    {key}
                  </td>
                  <td>
                    {editingAction === key ? (
                      <div className="edit-action">
                        <input
                          type="text"
                          value={editedAction}
                          onChange={(e) => setEditedAction(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleActionSave(key);
                            }
                          }}
                          autoFocus
                        />
                        <button onClick={() => handleActionSave(key)} title="Save">💾</button>
                        <button onClick={handleActionCancel} title="Cancel">❌</button>
                      </div>
                    ) : (
                      <div className="action-cell">
                        <button 
                          onClick={() => handleActionEdit(key, shortcut.action)}
                          className="edit-action-button"
                          title="Edit action"
                        >
                          ✏️
                        </button>
                        {shortcut.action}
                      </div>
                    )}
                  </td>
                  <td>
                    {editingDescription === key ? (
                      <div className="edit-description">
                        <input
                          type="text"
                          value={editedDescription}
                          onChange={(e) => setEditedDescription(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleDescriptionSave(key);
                            }
                          }}
                          autoFocus
                        />
                        <button onClick={() => handleDescriptionSave(key)} title="Save">💾</button>
                        <button onClick={() => {
                          setEditingDescription(null);
                          setEditedDescription('');
                        }} title="Cancel">❌</button>
                      </div>
                    ) : (
                      <div className="description-cell">
                        <button 
                          onClick={() => handleDescriptionEdit(key, shortcut.description)}
                          className="edit-description-button"
                          title="Edit description"
                        >
                          ✏️
                        </button>
                        {shortcut.description}
                      </div>
                    )}
                  </td>
                  <td className="delete-cell">
                    <button 
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this hotkey?')) {
                          handleDeleteHotkey(key);
                        }
                      }}
                      className="delete-button"
                      title="Delete hotkey"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="action-examples">
            <h3>Action Examples</h3>
            <p>When editing actions, you can use any of these formats:</p>
            <ul>
              {[
                ["addTag('game_start')", "Adds a game start tag"],
                ["addTag('home_possession')", "Adds a home possession tag"],
                ["addTag('away_possession')", "Adds an away possession tag"],
                ["addTag('home_clear')", "Adds a home clear tag"],
                ["addTag('away_clear')", "Adds an away clear tag"],
                ["addTag('home_turnover')", "Adds a home turnover tag"],
                ["addTag('away_turnover')", "Adds an away turnover tag"],
                ["addTag('home_score')", "Adds a home score tag"],
                ["addTag('touch')", "Adds a touch tag"],
                ["togglePlayPause", "Plays/pauses the video"],
                ["seekBackward(100)", "Moves backward by 100 frames"],
                ["seekForward(100)", "Moves forward by 100 frames"],
                ["addHighlight", "Adds a highlight tag"],
                ["slowDown", "Decreases playback speed"],
                ["speedUp", "Increases playback speed"],
                ["resetSpeed", "Resets playback speed to 1x"]
              ].map(([code, description]) => (
                <li key={code}>
                  <code 
                    onClick={() => {
                      if (editingAction) {
                        setEditedAction(code);
                      }
                    }}
                    className={editingAction ? "clickable" : ""}
                    title={editingAction ? "Click to use this action" : ""}
                  >
                    {code}
                  </code>
                  - {description}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {showKeyOverlay && (
          <div className="key-overlay">
            <div className="key-overlay-content">
              <h3>Press a key</h3>
              <div className="key-display">
                {newKey || 'Waiting for key press...'}
              </div>
              <div className="key-overlay-actions">
                <button 
                  onClick={handleKeyUpdate}
                  disabled={!newKey}
                >
                  OK
                </button>
                <button onClick={() => {
                  setShowKeyOverlay(false);
                  setEditingKey(null);
                  setNewKey('');
                }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="actions">
          <button onClick={() => navigate('/hotkeys')}>Back to List</button>
        </div>
      </div>
    </Layout>
  );
}

export default ViewHotkeyGroup; 