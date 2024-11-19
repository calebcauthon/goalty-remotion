import React, { useState, useContext } from 'react';
import { calculateScreenSequenceTags } from '../stats/statUtils';
import { handleTagApproval } from '../stats/tagApproval';
import { GlobalContext } from '../../index';

function ScreenProcessor({ selectedVideo, onTagsApproved, onPreview }) {
  const globalData = useContext(GlobalContext);
  const [proposedTags, setProposedTags] = useState([]);
  const [screenTagName, setScreenTagName] = useState('screen');

  const processClips = () => {
    if (!selectedVideo?.tags || !screenTagName) return;
    const newTags = calculateScreenSequenceTags(selectedVideo.tags, screenTagName);
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
    const fps = 30; // Assuming 30fps
    
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
          disabled={!screenTagName}
        >
          Process Screen Sequences
        </button>
        <input
          type="text"
          value={screenTagName}
          onChange={(e) => setScreenTagName(e.target.value)}
          placeholder="Enter screen tag name"
          className="screen-tag-input"
        />
        <div className="tooltip-container">
          <span className="info-icon" role="img" aria-label="info">ℹ️</span>
          <div className="tooltip-content">
            This processor:
            <ul>
              <li>Finds all instances of the specified screen tag</li>
              <li>Creates sequences including 2 touches before and 1 touch after</li>
              <li>Use this to analyze screen plays</li>
            </ul>
          </div>
        </div>
      </div>

      {proposedTags.length > 0 && (
        <div className="proposed-tags-container">
          <h2>Proposed Screen Sequence Tags</h2>
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

export default ScreenProcessor; 