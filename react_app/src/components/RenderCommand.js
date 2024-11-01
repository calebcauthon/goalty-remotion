import React, { useState } from 'react';
import './RenderCommand.css';

export const RenderCommand = ({ 
  selectedVideos, 
  videos, 
  selectedTags, 
  outputFileName,
  durationInFrames,
  fps,
  width,
  height,
  showFirstPartOnly = false,
  compositionId = 'viewFilm'
}) => {
  const [copied, setCopied] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [localOutputFileName, setLocalOutputFileName] = useState(outputFileName);
  
  // Create a copy of videos without the metadata column
  const videosWithoutMetadata = videos.map(video => {
    const { metadata, tags, ...videoWithoutMetadata } = video;
    return videoWithoutMetadata;
  });
  
  const command = `npx remotion render src/index_studio.js ${compositionId} --props='${JSON.stringify({
    selectedVideos,
    videos: videosWithoutMetadata,
    selectedTags
  })}' --codec=h264 ${localOutputFileName}`;

  const truncatedCommand = command.slice(0, 50) + '...';

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditFileName = (e) => {
    e.preventDefault();
    setLocalOutputFileName(e.target.outputName.value);
    setShowOverlay(false);
  };

  return (
    <div className="render-command">
      <div className="command-container">
        <pre className="command-text">{truncatedCommand}</pre>
        <button className="edit-button" onClick={() => setShowOverlay(true)}>
          ✏️
        </button>
        <button className="copy-button" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="output-filename">
        Output: {localOutputFileName}
      </div>
      
      {showOverlay && (
        <div className="filename-overlay">
          <div className="filename-modal">
            <form onSubmit={handleEditFileName}>
              <label>
                Edit Output Filename:
                <input 
                  type="text" 
                  name="outputName"
                  defaultValue={localOutputFileName}
                />
              </label>
              <div className="modal-buttons">
                <button type="submit">Save</button>
                <button type="button" onClick={() => setShowOverlay(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!showFirstPartOnly && (
        <div className="additional-info">
          <p>Additional rendering options:</p>
          <ul>
            <li>Duration: {durationInFrames} frames</li>
            <li>FPS: {fps}</li>
            <li>Resolution: {width}x{height}</li>
          </ul>
        </div>
      )}
    </div>
  );
};
