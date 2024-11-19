import React, { useState, useContext } from 'react';
import { GlobalContext } from '../../index';
import { findTurnoverSequences } from '../stats/statUtils';

function TurnoverProcessor({ 
  selectedVideo, 
  onTagsApproved,
  buttonText = "Process Attacking Sequences",
  teamTouchPrefix = "home_touch_",
  turnoverTag = "home_turnover",
  maxPrecedingTouches = 3
}) {
  const globalData = useContext(GlobalContext);
  const [proposedTags, setProposedTags] = useState([]);

  const processClips = () => {
    if (!selectedVideo?.tags) return;

    const sequences = findTurnoverSequences(
      selectedVideo.tags,
      teamTouchPrefix,
      maxPrecedingTouches
    );

    // Convert sequences to tags format
    const newTags = sequences.map(seq => ({
      name: turnoverTag,
      startFrame: seq.startFrame,
      endFrame: seq.endFrame,
      metadata: {
        touchCount: seq.touches.length,
        touches: seq.touches.map(t => ({
          name: t.name,
          frame: t.frame,
          originalTag: t.originalTag
        }))
      }
    }));

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
        >
          {buttonText}
        </button>
        <div className="tooltip-container">
          <span className="info-icon" role="img" aria-label="info">ℹ️</span>
          <div className="tooltip-content">
            This processor:
            <ul>
              <li>Finds sequences between "{teamTouchPrefix}attacking" and "{teamTouchPrefix}clearing"</li>
              <li>For each sequence, finds up to {maxPrecedingTouches} preceding touches starting with "{teamTouchPrefix}"</li>
              <li>Stops at any touch starting with "away_touch_" when looking for preceding touches</li>
            </ul>
          </div>
        </div>
      </div>

      {proposedTags.length > 0 && (
        <div className="proposed-tags-container">
          <h2>Proposed Attacking Sequence Tags</h2>
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

export default TurnoverProcessor; 