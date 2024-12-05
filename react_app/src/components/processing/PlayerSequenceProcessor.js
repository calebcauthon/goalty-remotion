import React, { useState, useContext, useEffect } from 'react';
import { GlobalContext } from '../../index';
import { findPlayerSequences } from '../stats/statUtils';
import { handleTagApproval } from '../stats/tagApproval';

function PlayerSequenceProcessor({ 
  selectedVideo, 
  onTagsApproved,
  onPreview
}) {
  const globalData = useContext(GlobalContext);
  const [playerName, setPlayerName] = useState('');
  const [proposedTags, setProposedTags] = useState([]);
  const [boxes, setBoxes] = useState([]);

  useEffect(() => {
    const metadataText = selectedVideo?.metadata;
    const metadata = metadataText ? JSON.parse(metadataText) : {};
    setBoxes(metadata.boxes);
  }, [selectedVideo]);

  const processSequences = () => {
    if (!boxes || !playerName) {
      console.log('No video or player name', { boxes, playerName });
      return;
    }

    const sequences = findPlayerSequences({ boxes }, playerName);
    
    const newTags = sequences.map(seq => ({
      name: `${playerName}_in_game`,
      startFrame: seq.startFrame,
      endFrame: seq.endFrame,
      metadata: {
        durationFrames: seq.endFrame - seq.startFrame,
        durationSeconds: Math.round((seq.endFrame - seq.startFrame) / 30 * 10) / 10
      }
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

  const handlePreviewSequence = (sequence, type = 'full') => {
    if (!onPreview) return;
    
    const duration = sequence.endFrame - sequence.startFrame;
    const fps = 30;
    
    switch (type) {
      case 'start':
        onPreview(sequence.startFrame, sequence.startFrame + (2 * fps));
        break;
      case 'middle':
        const midPoint = sequence.startFrame + Math.floor(duration / 2);
        onPreview(midPoint - fps, midPoint + fps);
        break;
      case 'end':
        onPreview(sequence.endFrame - (2 * fps), sequence.endFrame);
        break;
      default:
        onPreview(sequence.startFrame, sequence.endFrame);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter player name"
          className="player-input"
        />
        <button 
          className="process-button"
          onClick={processSequences}
          disabled={!playerName}
        >
          Find Player Sequences
        </button>
        <div className="tooltip-container">
          <span className="info-icon" role="img" aria-label="info">ℹ️</span>
          <div className="tooltip-content">
            This processor:
            <ul>
              <li>Finds all sequences where player is visible</li>
              <li>Creates tags for sequences 3+ frames long</li>
              <li>Includes duration information</li>
            </ul>
          </div>
        </div>
      </div>

      {proposedTags.length > 0 && (
        <div className="proposed-tags-container">
          <h2>Proposed Player Sequence Tags</h2>
          <div className="sequences-preview">
            {proposedTags.map((tag, index) => (
              <div key={index} className="sequence-item">
                <span>
                  Sequence {index + 1}: {tag.metadata.durationSeconds}s 
                  ({tag.metadata.durationFrames} frames)
                </span>
                <div className="preview-buttons">
                  <button 
                    className="preview-button"
                    onClick={() => handlePreviewSequence(tag, 'start')}
                  >
                    First 2s
                  </button>
                  <button 
                    className="preview-button"
                    onClick={() => handlePreviewSequence(tag, 'middle')}
                  >
                    Middle 2s
                  </button>
                  <button 
                    className="preview-button"
                    onClick={() => handlePreviewSequence(tag, 'end')}
                  >
                    Last 2s
                  </button>
                  <button 
                    className="preview-button"
                    onClick={() => handlePreviewSequence(tag, 'full')}
                  >
                    Full Preview
                  </button>
                </div>
              </div>
            ))}
          </div>
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

export default PlayerSequenceProcessor; 