import React, { useState, useEffect } from 'react';
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
  // Generate default filename with date/time
  const getDefaultFileName = () => {
    const now = new Date();
    const dateStr = now.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19);
    const baseName = outputFileName.replace(/\.[^/.]+$/, ''); // Remove extension
    const extension = outputFileName.split('.').pop(); // Get extension
    return `${baseName}_${dateStr}.${extension}`;
  };

  const [copied, setCopied] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [localOutputFileName, setLocalOutputFileName] = useState(getDefaultFileName());
  
  // Update filename when outputFileName prop changes
  useEffect(() => {
    setLocalOutputFileName(getDefaultFileName());
  }, [outputFileName]);

  // Update timestamp every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!showOverlay) { // Don't update if user is editing
        setLocalOutputFileName(getDefaultFileName());
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [outputFileName, showOverlay]);

  // Create a copy of videos without the metadata column
  const videosWithoutMetadata = videos.map(video => {
    const { videoWithoutMetadata, metadata } = (() => {
      const { metadata, tags: videoTags, ...rest } = video;
      return { videoWithoutMetadata: rest, metadata };
    })();

    const other = ((metadata) => {
      const { tags: metadataTags, extracted_yt_info, ...otherMetadata } = metadata;
      return otherMetadata;
    })(JSON.parse(metadata));

    videoWithoutMetadata.metadata = other;
    return videoWithoutMetadata;
  });

  // Filter videos to only include those in selectedVideos
  const filteredVideosWithoutMetadata = videosWithoutMetadata.filter(video => 
    selectedVideos.includes(video.id)
  );
  
  const command = `npx remotion render src/index_studio.js ${compositionId} --props='${JSON.stringify({
    selectedVideos,
    videos: filteredVideosWithoutMetadata,
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
