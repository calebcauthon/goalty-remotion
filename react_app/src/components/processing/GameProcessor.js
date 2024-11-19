import React, { useState, useContext } from 'react';
import { GlobalContext } from '../../index';
import { findGameSequences } from '../stats/statUtils';
import { handleTagApproval } from '../stats/tagApproval';

function GameProcessor({ selectedVideo, onTagsApproved }) {
  const globalData = useContext(GlobalContext);
  const [proposedTags, setProposedTags] = useState([]);

  const processGames = () => {
    if (!selectedVideo?.tags) return;

    const sequences = findGameSequences(selectedVideo.tags);
    const newTags = sequences.map(seq => ({
      name: 'game',
      startFrame: seq.startFrame,
      endFrame: seq.endFrame,
      metadata: seq.metadata
    }));

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
          onClick={processGames}
        >
          Process Games
        </button>
        <div className="tooltip-container">
          <span className="info-icon" role="img" aria-label="info">ℹ️</span>
          <div className="tooltip-content">
            This processor:
            <ul>
              <li>Finds sequences between game_start and game_end tags</li>
              <li>Creates game tags with duration and game number</li>
            </ul>
          </div>
        </div>
      </div>

      {proposedTags.length > 0 && (
        <div className="proposed-tags-container">
          <h2>Proposed Game Tags</h2>
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

export default GameProcessor; 