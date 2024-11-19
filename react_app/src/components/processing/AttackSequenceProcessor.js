import React, { useState, useContext } from 'react';
import { GlobalContext } from '../../index';
import { findTeamAttackSequences } from '../stats/statUtils';
import { handleTagApproval } from '../stats/tagApproval';

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

    let sequences = findTeamAttackSequences(selectedVideo, team);
    if (scoringOnly) {
      sequences = sequences.filter(seq => seq.scored);
    }

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