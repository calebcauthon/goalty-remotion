import React, { useState, useContext } from 'react';
import { GlobalContext } from '../../index';
import { findTeamAttackSequences } from '../stats/statUtils';

function AttackSequenceProcessor({ 
  selectedVideo, 
  onTagsApproved,
  team,
  scoringOnly = false,
  buttonText = "Find Attack Sequences"
}) {
  const globalData = useContext(GlobalContext);
  const [proposedTags, setProposedTags] = useState([]);

  const processClips = () => {
    if (!selectedVideo?.tags) return;

    // Get all attack sequences for the team
    let sequences = findTeamAttackSequences(selectedVideo, team);

    // Filter for scoring sequences if requested
    if (scoringOnly) {
      sequences = sequences.filter(seq => seq.scored);
    }

    // Convert sequences to tags format
    const newTags = sequences.map(seq => ({
      name: `${team}_attack_sequence`,
      startFrame: seq.startFrame,
      endFrame: seq.endFrame,
      metadata: {
        touchCount: seq.touches.length,
        scored: seq.scored,
        touches: seq.touches.map(t => ({
          name: t.name,
          frame: t.frame
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
              <li>Finds all attack sequences for {team} team</li>
              <li>Attack sequence: clearing touch followed by attacking touch</li>
              <li>Includes touch count and scoring information</li>
              {scoringOnly && <li>Only includes sequences that resulted in a score</li>}
            </ul>
          </div>
        </div>
      </div>

      {proposedTags.length > 0 && (
        <div className="proposed-tags-container">
          <h2>Proposed Attack Sequence Tags</h2>
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

export default AttackSequenceProcessor; 