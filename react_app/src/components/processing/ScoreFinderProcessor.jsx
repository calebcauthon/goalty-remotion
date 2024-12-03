import React, { useState } from 'react';
import { calculateAttackSequenceTags } from '../stats/statUtils';
import { handleTagApproval } from '../stats/tagApproval';

function ScoreFinderProcessor({ 
  selectedVideo,
  onTagsApproved,
  team,
  globalData
}) {
  const [proposedTags, setProposedTags] = useState([]);

  const processClips = () => {
    if (!selectedVideo?.tags || !team) return;
    const newTags = calculateAttackSequenceTags(selectedVideo.tags, team);
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
      <button 
        className="process-button"
        onClick={processClips}
        disabled={!team}
      >
        {`Find Scores (${team})`}
      </button>

      {proposedTags.length > 0 && (
        <div className="proposed-tags-container">
          <h2>{team} Score Tags</h2>
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

export default ScoreFinderProcessor; 