import React, { useState, useContext } from 'react';
import { GlobalContext } from '../../index';
import { findValidSequences } from './findValidSequences';

function TurnoverProcessor({ selectedVideo, onTagsApproved, buttonText = "Process Attacking Sequences", team = "home" }) {
  const globalData = useContext(GlobalContext);
  const [proposedTags, setProposedTags] = useState([]);

  const teamConfig = {
    touchPrefix: `${team}_touch_`,
    opposingTouchPrefix: `${team === 'home' ? 'away' : 'home'}_touch_`,
    attackingTag: `${team}_touch_attacking`,
    clearingTag: `${team === 'home' ? 'away' : 'home'}_touch_clearing`,
    turnoverTag: `${team}_turnover`
  };

  const findPrecedingTouches = (tags, attackingTag) => {
    const precedingTouches = [];
    const sortedTags = [...tags]
      .sort((a, b) => a.frame - b.frame)
      .filter(tag => tag.frame < attackingTag.frame);
      
    // Work backwards from the attacking tag
    for (let i = sortedTags.length - 1; i >= 0 && precedingTouches.length < 3; i--) {
      const tag = sortedTags[i];
      
      // Break if we hit an opposite team touch
      if (tag.name.startsWith(teamConfig.opposingTouchPrefix)) break;
      
      // Add team touches to our sequence
      if (tag.name.startsWith(teamConfig.touchPrefix)) {
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
      teamConfig.attackingTag,
      teamConfig.clearingTag,
      ['score', teamConfig.attackingTag],
      teamConfig.turnoverTag
    );

    // For each sequence, find the preceding touches
    const allTags = [];
    attackingSequences.forEach(sequence => {
      // Find the original attacking tag
      const attackingTag = selectedVideo.tags.find(
        tag => tag.name === teamConfig.attackingTag && tag.frame === sequence.startFrame
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
          {buttonText}
        </button>
        <div className="tooltip-container">
          <span className="info-icon" role="img" aria-label="info">ℹ️</span>
          <div className="tooltip-content">
            This processor:
            <ul>
              <li>Finds sequences between "{teamConfig.attackingTag}" and "{teamConfig.clearingTag}"</li>
              <li>For each sequence, finds up to 3 preceding {team} touches</li>
              <li>Stops at any {team === 'home' ? 'away' : 'home'} touch when looking for preceding touches</li>
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