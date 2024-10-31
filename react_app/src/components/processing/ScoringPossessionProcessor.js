import React, { useState } from 'react';

export const findValidSequences = (tags, startTagName, endTagName, excludeTagName, outputTagName) => {
  const sortedTags = [...tags].sort((a, b) => a.startFrame - b.startFrame);
  const sequences = [];
  
  sortedTags.forEach((startTag, startIndex) => {
    if (startTag.name === startTagName) {
      for (let i = startIndex + 1; i < sortedTags.length; i++) {
        const currentTag = sortedTags[i];
        
        if (currentTag.name === endTagName) {
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
          break;
        }
      }
    }
  });

  return sequences;
};

function ScoringPossessionProcessor({ 
  selectedVideo, 
  onTagsApproved,
  startTagName,
  endTagName,
  excludeTagName,
  outputTagName,
  buttonText
}) {
  const [proposedTags, setProposedTags] = useState([]);

  const processClips = () => {
    if (!selectedVideo?.tags) return;

    const newTags = findValidSequences(
      selectedVideo.tags,
      startTagName,
      endTagName,
      excludeTagName,
      outputTagName
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
        {buttonText || `Process ${outputTagName}`}
      </button>

      {proposedTags.length > 0 && (
        <div className="proposed-tags-container">
          <h2>Proposed {outputTagName} Tags</h2>
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
