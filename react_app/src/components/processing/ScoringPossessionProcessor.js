import React, { useState } from 'react';

function ScoringPossessionProcessor({ selectedVideo, onTagsApproved }) {
  const [proposedTags, setProposedTags] = useState([]);

  const findValidSequences = (tags, startTagName, endTagName, excludeTagName, outputTagName) => {
    // Sort tags by frame
    const sortedTags = [...tags].sort((a, b) => a.startFrame - b.startFrame);
    const sequences = [];
    
    // Find all potential start tags
    sortedTags.forEach((startTag, startIndex) => {
      if (startTag.name === startTagName) {
        // Look for the next end tag after this start tag
        for (let i = startIndex + 1; i < sortedTags.length; i++) {
          const currentTag = sortedTags[i];
          
          if (currentTag.name === endTagName) {
            // Check if there's any exclude tag between start and end
            const hasExcludeTag = sortedTags
              .slice(startIndex + 1, i)
              .some(tag => tag.name === excludeTagName);

            if (!hasExcludeTag) {
              sequences.push({
                name: outputTagName,
                startFrame: startTag.frame,
                endFrame: currentTag.frame
              });
            }
            break; // Move to next start tag
          }
        }
      }
    });

    return sequences;
  };

  const processClips = () => {
    if (!selectedVideo?.tags) return;

    const newTags = findValidSequences(
      selectedVideo.tags,
      'home_possession',    // Start tag
      'home_score',         // End tag
      'home_turnover',      // Exclude tag
      'scoring_possession'  // Output tag name
    );

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
