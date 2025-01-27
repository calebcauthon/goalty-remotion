import React, { useEffect, useState } from 'react';
import Draggable from 'react-draggable';
import axios from 'axios';

export function HotkeySection({
  hotkeyMode,
  toggleHotkeyMode,
  hotkeyGroups,
  activeGroupId,
  setActiveGroupId,
  setActiveGroupInstructions,
  setTurnedOnInstructions,
  turnedOnInstructions,
  buttonOrder,
  setButtonOrder,
  buttonPositions,
  setButtonPositions,
  dragMode,
  setDragMode,
  activeIncrementButtons,
  setActiveIncrementButtons,
  hotkeyButtonsExpanded,
  setHotkeyButtonsExpanded,
  hotkeysExpanded,
  setHotkeysExpanded,
  globalData
}) {
  const [activeInstructions, setActiveInstructions] = useState(new Set());

  useEffect(() => {
    const fetchHotkeys = async () => {
      try {
        const response = await axios.get(`${globalData.APIbaseUrl}/api/hotkeys/`);
        if (response.data.length > 0) {
          const firstGroup = response.data[0];
          setActiveGroupId(firstGroup.id);
          setActiveGroupInstructions(firstGroup.instructions || []);
        }
      } catch (error) {
        console.error('Error fetching hotkeys:', error);
      }
    };

    fetchHotkeys();
  }, []);

  useEffect(() => {
    if (hotkeyGroups.length > 0 && activeGroupId) {
      const currentGroup = hotkeyGroups.find(g => g.id === activeGroupId);
      // Instructions are now objects with name and text properties
      setActiveGroupInstructions(currentGroup?.instructions || []);
    }
  }, [activeGroupId, hotkeyGroups]);

  const handleDragStop = (key, e, data) => {
    const newPositions = {
      ...buttonPositions,
      [key]: { x: data.x, y: data.y }
    };
    setButtonPositions(newPositions);
    localStorage.setItem(`hotkey-positions-${activeGroupId}`, JSON.stringify(newPositions));
  };

  const renderHotkeyGroupSelector = () => (
    <select 
      value={activeGroupId || ''} 
      onChange={(e) => setActiveGroupId(Number(e.target.value))}
      className="hotkey-set-selector"
    >
      {hotkeyGroups.map(group => (
        <option key={group.id} value={group.id}>{group.name}</option>
      ))}
    </select>
  );

  const renderHotkeyInstructions = () => {
    if (!hotkeyGroups.length || activeGroupId === null) return null;
    
    const currentGroup = hotkeyGroups.find(group => group.id === activeGroupId);
    if (!currentGroup || !currentGroup.shortcuts) return null;

    return (
      <ul>
        {currentGroup.shortcuts.shortcuts ? (
          <>
            <h2>Shortcuts</h2>
            {Object.entries(currentGroup.shortcuts.shortcuts).map(([key, shortcut]) => (
              <li key={key}>'{key}': {shortcut.description}</li>
            ))}
            <br/>
            <h2>Instructions</h2>
            {Object.entries(currentGroup.shortcuts.instructions).map(([key, instruction]) => (
              <li key={key} className="instruction-item">
                <input
                  type="checkbox"
                  checked={Array.from(turnedOnInstructions).some(i => i.name === instruction.name)}
                  onChange={() => {
                    console.log('updating instructions', instruction);
                    setTurnedOnInstructions(prev => {
                      const next = new Set(prev);
                      const existing = Array.from(next).find(i => i.name === instruction.name);
                      if (existing) {
                        next.delete(existing);
                      } else {
                        next.add(instruction);
                      }
                      console.log('next', next);
                      return next;
                    });
                  }}
                />
                {instruction.name}
              </li>
            ))}
          </>
        ) : (
          Object.entries(currentGroup.shortcuts).map(([key, shortcut]) => (
            <li key={key}>'{key}': {shortcut.description}</li>
          ))
        )}
      </ul>
    );
  };

  const [activeShortcuts, setActiveShortcuts] = useState([]);
  useEffect(() => {
    const group = hotkeyGroups.find(g => g.id === activeGroupId);
    setActiveShortcuts(group?.shortcuts?.shortcuts || group?.shortcuts || []);
  }, [activeGroupId, hotkeyGroups]);

  return (
    <>
      <div className="hotkey-buttons">
        <div className="hotkey-buttons-header">
          <h3 onClick={() => setHotkeyButtonsExpanded(!hotkeyButtonsExpanded)}>
            Hotkey Buttons {hotkeyButtonsExpanded ? '▼' : '▶'}
          </h3>
          {hotkeyButtonsExpanded && (
            <button 
              onClick={() => setDragMode(!dragMode)}
              className={`drag-toggle ${dragMode ? 'active' : ''}`}
            >
              {dragMode ? '🔒 Lock' : '✋ Drag'}
            </button>
          )}
        </div>
        {hotkeyButtonsExpanded && (
          <div className="hotkey-buttons-container">
            {buttonOrder.map((key) => {
              const shortcut = activeShortcuts[key];
              if (!shortcut) return null;
              
              const isIncrementButton = shortcut.description.startsWith('+');
              const incrementKey = isIncrementButton ? 
                shortcut.description.slice(1).match(/^\S+/)?.[0] : null;
              const isActive = isIncrementButton && activeIncrementButtons.has(incrementKey);
              
              return (
                <Draggable 
                  key={key}
                  defaultPosition={buttonPositions[key] || {x: 0, y: 0}}
                  position={buttonPositions[key] || null}
                  bounds="parent"
                  disabled={!dragMode}
                  onStop={(e, data) => handleDragStop(key, e, data)}
                >
                  <button
                    onClick={() => {
                      if (!dragMode) {
                        try {
                          eval(shortcut.action);
                          
                          if (isIncrementButton && incrementKey) {
                            setActiveIncrementButtons(prev => {
                              const next = new Set(prev);
                              next.add(incrementKey);
                              return next;
                            });
                          } else if (shortcut.description.startsWith('-')) {
                            const decrementKey = shortcut.description.slice(1).match(/^\S+/)?.[0];
                            if (decrementKey) {
                              setActiveIncrementButtons(prev => {
                                const next = new Set(prev);
                                next.delete(decrementKey);
                                return next;
                              });
                            }
                          }
                        } catch (error) {
                          console.error('Error executing hotkey action:', error);
                        }
                      }
                    }}
                    className={`hotkey-action-button ${dragMode ? 'draggable' : ''} ${isActive ? 'active-increment' : ''}`}
                  >
                    {shortcut.description} ({key})
                  </button>
                </Draggable>
              );
            })}
          </div>
        )}
      </div>

      <div className="hotkey-controls">
        <button onClick={toggleHotkeyMode}>
          {hotkeyMode ? 'Disable Hotkey Mode' : 'Enable Hotkey Mode'}
        </button>
        {renderHotkeyGroupSelector()}
      </div>

      <div className={`hotkey-indicator ${hotkeyMode ? 'active' : ''}`}>
        Hotkeys: {hotkeyMode ? 'ENABLED' : 'DISABLED'} | 
        Group: {hotkeyGroups.find(g => g.id === activeGroupId)?.name || 'None'}
      </div>

      <div className="hotkey-instructions">
        <div className="hotkey-header" onClick={() => setHotkeysExpanded(!hotkeysExpanded)}>
          <h3>Hotkeys {hotkeysExpanded ? '▼' : '▶'}</h3>
        </div>
        {hotkeysExpanded && (
          <>
            <h4>Current Group: {hotkeyGroups.find(g => g.id === activeGroupId)?.name}</h4>
            {renderHotkeyInstructions()}
          </>
        )}
      </div>
    </>
  );
} 