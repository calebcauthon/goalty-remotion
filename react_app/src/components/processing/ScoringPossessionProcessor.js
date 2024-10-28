import React, { useState } from 'react';

function ScoringPossessionProcessor({ selectedVideo, onTagsApproved }) {
  const [proposedTags, setProposedTags] = useState([]);

  const processClips = () => {
    if (!selectedVideo?.tags) return;

    // Sort tags by frame
    const sortedTags = [...selectedVideo.tags].sort((a, b) => a.startFrame - b.startFrame);
    const newTags = [];
    
    let currentPossession = null;

    sortedTags.forEach((tag) => {
      if (tag.name === 'home_possession') {
        currentPossession = tag;
      } else if (tag.name === 'home_turnover') {
        currentPossession = null;
      } else if (tag.name === 'home_score' && currentPossession) {
        // Create a new scoring possession tag
        newTags.push({
          name: 'scoring_possession',
          startFrame: currentPossession.frame,
          endFrame: tag.frame
        });
        currentPossession = null;
      }
    });

    setProposedTags(newTags);
  };

  const handleApproveProposedTags = async () => {
    if (!selectedVideo || proposedTags.length === 0) return;

    try {
      // Get existing metadata and add new tags
      const metadata = selectedVideo.metadata ? JSON.parse(selectedVideo.metadata) : {};
      const existingTags = metadata.tags || [];
      const updatedTags = [...existingTags, ...proposedTags];

      const response = await fetch(`http://localhost:5000/api/videos/${selectedVideo.id}/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: JSON.stringify({ ...metadata, tags: updatedTags })
        }),
      });

      if (!response.ok) throw new Error('Failed to save tags');

      // Clear proposed tags
      setProposedTags([]);
      
      // Notify parent component
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
      >
        Process Scoring Possessions
      </button>

      {proposedTags.length > 0 && (
        <div className="proposed-tags-container">
          <h2>Proposed Scoring Possession Tags</h2>
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
