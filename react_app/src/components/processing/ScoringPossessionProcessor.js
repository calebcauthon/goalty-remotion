import React, { useState, useContext } from 'react';
import { GlobalContext } from '../../index';
import { findValidSequences } from './findValidSequences';

function ScoringPossessionProcessor({ 
  selectedVideo, 
  onTagsApproved,
  startTagName,
  endTagName,
  excludeTagName,
  outputTagName,
  buttonText
}) {
  const globalData = useContext(GlobalContext);
  const [proposedTags, setProposedTags] = useState([]);

  const processClips = () => {
    console.log("Processing clips for ", { selectedVideo });
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
