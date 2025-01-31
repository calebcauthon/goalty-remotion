import React, { useState } from 'react';
import { handleTagApproval } from '../stats/tagApproval';

function UserAddsTagsDirectly({ selectedVideo, onTagsApproved, globalData }) {
  const [proposedTags, setProposedTags] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleApproveProposedTags = async () => {
    try {
      const parsedTags = JSON.parse(proposedTags);
      const success = await handleTagApproval(selectedVideo, parsedTags, globalData.APIbaseUrl);
      if (success) {
        setProposedTags('');
        setIsEditing(false);
        onTagsApproved();
      }
    } catch (error) {
      alert('Invalid JSON format');
      console.error('Error parsing tags:', error);
    }
  };

  const insertTemplate = () => {
    const template = [
      {
        "name": "player_name playing",
        "startFrame": 100,
        "endFrame": 200
      }
    ];
    setProposedTags(JSON.stringify(template, null, 2));
  };

  return (
    <div>
      <button 
        className="process-button"
        onClick={() => setIsEditing(true)}
      >
        Add Tags Manually
      </button>

      {isEditing && (
        <div className="proposed-tags-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Enter Tag Data (JSON format)</h2>
            <button 
              className="process-button"
              onClick={insertTemplate}
              style={{ marginLeft: '10px' }}
            >
              Insert Template
            </button>
          </div>
          <textarea
            value={proposedTags}
            onChange={(e) => setProposedTags(e.target.value)}
            rows={10}
            className="proposed-tags-textarea"
            placeholder='[{"name": "example_tag", "frame": 123}]'
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

export default UserAddsTagsDirectly; 