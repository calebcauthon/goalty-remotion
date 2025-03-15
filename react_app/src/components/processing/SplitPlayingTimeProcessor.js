import React, { useState, useContext, useEffect } from 'react';
import { GlobalContext } from '../../index';
import { splitPlayingTimeTags } from '../stats/statUtils';
import { handleTagApproval } from '../stats/tagApproval';

function SplitPlayingTimeProcessor({ selectedVideo, onTagsApproved }) {
  const globalData = useContext(GlobalContext);
  const [proposedTags, setProposedTags] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [playerNames, setPlayerNames] = useState([]);
  const [team, setTeam] = useState('home');

  useEffect(() => {
    if (selectedVideo?.tags) {
      // Extract unique player names from existing playing time tags
      const names = new Set();
      selectedVideo.tags.forEach(tag => {
        if (tag.name.includes(' playing')) {
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
    if (!selectedVideo?.tags || !playerName || !team) return;
    const newTags = splitPlayingTimeTags(selectedVideo.tags, playerName, team);
    console.log({ tags: selectedVideo.tags, playerName, team, newTags });
    setProposedTags(newTags);
  };

  const handleApproveProposedTags = async () => {
    const success = await handleTagApproval(selectedVideo, proposedTags, globalData.APIbaseUrl);
    if (success) {
      setProposedTags([]);
      onTagsApproved();
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
          Split Playing Time
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
        <select
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          className="team-select"
        >
          <option value="home">Home</option>
          <option value="away">Away</option>
        </select>
        <div className="tooltip-container">
          <span className="info-icon" role="img" aria-label="info">ℹ️</span>
          <div className="tooltip-content">
            This processor:
            <ul>
              <li>Finds all "&lt;playerName&gt; playing" tags</li>
              <li>Splits them into offense/defense segments based on which team is attacking</li>
              <li>Creates new tags like "&lt;playerName&gt; playing offense" and "&lt;playerName&gt; playing defense"</li>
            </ul>
          </div>
        </div>
      </div>

      {proposedTags.length > 0 && (
        <div className="proposed-tags-container">
          <h2>Proposed {playerName} Split Playing Tags</h2>
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

export default SplitPlayingTimeProcessor; 