import React, { useState, useContext } from 'react';
import { GlobalContext } from '../../index';
import { findTeamAttackSequences } from '../stats/statUtils';
import { handleTagApproval } from '../stats/tagApproval';

function AttackSequenceProcessor({ 
  selectedVideo, 
  onTagsApproved,
  team,
  scoringOnly = false,
  buttonText = "Find Attack Sequences",
  onPreview
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

  const handlePreviewSequence = (sequence, type = 'full') => {
    if (!onPreview) return;
    
    const duration = sequence.endFrame - sequence.startFrame;
    const fps = 30; // Assuming 30fps, adjust if different
    
    switch (type) {
      case 'start':
        onPreview(sequence.startFrame, sequence.startFrame + (2 * fps));
        break;
      case 'middle':
        const midPoint = sequence.startFrame + Math.floor(duration / 2);
        onPreview(midPoint - fps, midPoint + fps);
        break;
      case 'end':
        onPreview(sequence.endFrame - (4 * fps), sequence.endFrame);
        break;
      default:
        onPreview(sequence.startFrame, sequence.endFrame);
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
          <div className="sequences-preview">
            {proposedTags.map((tag, index) => (
              <div key={index} className="sequence-item">
                <span>Sequence {index + 1}: {tag.metadata.touchCount} touches</span>
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
                    Last 4s
                  </button>
                  <button 
                    className="preview-button"
                    data-type="full"
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

export default AttackSequenceProcessor; 