import React, { useState, useContext, useEffect } from 'react';
import { GlobalContext } from '../../index';
import { findValidSequences } from './findValidSequences';

function PlayingTimeProcessor({ selectedVideo, onTagsApproved }) {
  const globalData = useContext(GlobalContext);
  const [proposedTags, setProposedTags] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [playerNames, setPlayerNames] = useState([]);


  useEffect(() => {
    // Inject styles
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  useEffect(() => {
    if (selectedVideo?.tags) {
      // Extract unique player names from existing tags
      const names = new Set();
      selectedVideo.tags.forEach(tag => {
        if (tag.name.includes(' IN') || tag.name.includes(' OUT')) {
          const name = tag.name.split(' ')[0].toLowerCase();
          names.add(name);
        }
      });
      const sortedNames = Array.from(names).sort();
      setPlayerNames(sortedNames);
      setPlayerName(sortedNames[0] || '');
    }
  }, [selectedVideo]);

  const processClips = () => {
    if (!selectedVideo?.tags || !playerName) return;

    const newTags = findValidSequences(
      selectedVideo.tags,
      `${playerName} IN`,
      `${playerName} OUT`,
      [`${playerName} OUT`],
      `${playerName} playing`
    );

    setProposedTags(newTags);
  };

  const handleApproveProposedTags = async () => {
    if (!selectedVideo || proposedTags.length === 0) return;

    try {
      const metadata = selectedVideo.metadata ? JSON.parse(selectedVideo.metadata) : {};
      const existingTags = metadata.tags || [];
      const updatedTags = [...existingTags, ...proposedTags];

      const response = await fetch(`${globalData.APIbaseUrl}/api/videos/${selectedVideo.id}/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: JSON.stringify({ ...metadata, tags: updatedTags })
        }),
      });

      if (!response.ok) throw new Error('Failed to save tags');

      setProposedTags([]);
      onTagsApproved();
    } catch (error) {
      console.error('Error saving proposed tags:', error);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}> 
        <button 
          className="process-button"
          onClick={processClips}
          disabled={!playerName}
        >
          Process Playing Time
        </button>
        <select
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="player-name-select"
        >
          {playerNames.length === 0 && (
            <option value="">No players found</option>
          )}
          {playerNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <div className="tooltip-container">
          <span className="info-icon" role="img" aria-label="info">ℹ️</span>
          <div className="tooltip-content">
            This processor:
            <ul>
              <li>Finds all sequences between "&lt;playerName&gt; IN" and "&lt;playerName&gt; OUT" tags</li>
              <li>Creates new "&lt;playerName&gt; playing" tags for each valid sequence</li>
              <li>Excludes sequences that contain "&lt;playerName&gt; OUT" tags</li>
              <li>Use this to track player time on field</li>
            </ul>
          </div>
        </div>
      </div>

      {proposedTags.length > 0 && (
        <div className="proposed-tags-container">
          <h2>Proposed {playerName} Playing Tags</h2>
          <textarea
            readOnly
            value={JSON.stringify(proposedTags, null, 2)}
            rows={10}
            className="proposed-tags-textarea"
          />
          <button 
            className="approve-button"
            onClick={handleApproveProposedTags}
          >
            Approve and Save Tags
          </button>
        </div>
      )}
    </div>
  );
}

const styles = `
.tooltip-container {
  position: relative;
  display: inline-block;
  margin-left: 8px;
}

.info-icon {
  cursor: help;
  font-size: 16px;
}

.tooltip-content {
  display: none;
  position: absolute;
  left: 25px;
  top: -5px;
  background: #333;
  color: white;
  padding: 10px;
  border-radius: 4px;
  width: 250px;
  z-index: 100;
  font-size: 14px;
}

.tooltip-content ul {
  margin: 5px 0;
  padding-left: 20px;
}

.tooltip-content li {
  margin: 3px 0;
}

.tooltip-container:hover .tooltip-content {
  display: block;
}

/* Add arrow */
.tooltip-content::before {
  content: "";
  position: absolute;
  left: -5px;
  top: 10px;
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-right: 5px solid #333;
}
`;

export default PlayingTimeProcessor; 