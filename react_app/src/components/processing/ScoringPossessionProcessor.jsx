import React, { useState } from 'react';
import { findTagSequences } from '../stats/statUtils';

export const calculateTags = (tags, home) => {
  if (!tags) return [];
  
  const away = home == "home" ? "away" : "home";

  // Filter to only include relevant touches and scores
  const relevantTags = tags.filter(tag => 
    tag.name.includes("_touch_") ||
    tag.name.includes("score")
  );

  // Find sequences that start with a touch and end with a score
  const sequences = findTagSequences(
    relevantTags,
    `${home}_touch_attacking`,
    [`${home}_score`],
    [`${away}_touch_clearing`, `${away}_touch_attacking`]
  );

  return sequences.map(seq => ({
    name: `${home}_scoring_possession`,
    startFrame: seq.startFrame,
    endFrame: seq.endFrame,
    metadata: {
      touchCount: seq.touches.length,
      touches: seq.touches.map(t => ({
        name: t.name,
        frame: t.frame
      }))
    }
  }));
};

function ScoringPossessionProcessor({ 
  selectedVideo,
  onTagsApproved,
  team,
  globalData
}) {
  const [proposedTags, setProposedTags] = useState([]);

  const processClips = () => {
    if (!selectedVideo?.tags || !team) return;
    const newTags = calculateTags(selectedVideo.tags, team);
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
      <button 
        className="process-button"
        onClick={processClips}
        disabled={!team}
      >
        {`Process ${team || ''} Scoring Possessions`}
      </button>

      {proposedTags.length > 0 && (
        <div className="proposed-tags-container">
          <h2>{team} Scoring Possession Tags</h2>
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

export default ScoringPossessionProcessor;
