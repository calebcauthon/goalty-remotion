import React, { useState, useContext } from 'react';
import { GlobalContext } from '../../index';
import { findValidSequences } from './findValidSequences';

function TurnoverProcessor({ selectedVideo, onTagsApproved }) {
  const globalData = useContext(GlobalContext);
  const [proposedTags, setProposedTags] = useState([]);

  const findPrecedingTouches = (tags, attackingTag) => {
    const precedingTouches = [];
    const sortedTags = [...tags]
      .sort((a, b) => a.frame - b.frame)
      .filter(tag => tag.frame < attackingTag.frame);
      

    // Work backwards from the attacking tag
    for (let i = sortedTags.length - 1; i >= 0 && precedingTouches.length < 3; i--) {
      const tag = sortedTags[i];
      
      // Break if we hit an away touch
      if (tag.name.startsWith('away_touch_')) break;
      
      // Add home touches to our sequence
      if (tag.name.startsWith('home_touch_')) {
        precedingTouches.unshift({
          name: 'preceding_touch',
          frame: tag.frame,
          originalTag: tag.name
        });
      }
    }

    return precedingTouches;
  };

  const processClips = () => {
    if (!selectedVideo?.tags) return;

    // First find all attacking sequences
    const attackingSequences = findValidSequences(
      selectedVideo.tags,
      'home_touch_attacking',
      'away_touch_clearing',
      ['score', 'home_touch_attacking'],
      'home_turnover'
    );

    // For each sequence, find the preceding touches
    const allTags = [];
    attackingSequences.forEach(sequence => {
      // Find the original attacking tag
      const attackingTag = selectedVideo.tags.find(
        tag => tag.name === 'home_touch_attacking' && tag.frame === sequence.startFrame
      );

      if (attackingTag) {
        const precedingTouches = findPrecedingTouches(selectedVideo.tags, attackingTag);
        const earliestFrame = precedingTouches.length > 0 ? precedingTouches[0].frame : sequence.startFrame;
        allTags.push({...sequence, startFrame: earliestFrame});
      }
    });

    setProposedTags(allTags);
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
          Process Attacking Sequences
        </button>
        <div className="tooltip-container">
          <span className="info-icon" role="img" aria-label="info">ℹ️</span>
          <div className="tooltip-content">
            This processor:
            <ul>
              <li>Finds sequences between "home_touch_attacking" and "away_touch_clearing"</li>
              <li>For each sequence, finds up to 3 preceding home touches</li>
              <li>Stops at any away touch when looking for preceding touches</li>
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