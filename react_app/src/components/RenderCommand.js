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
  showFirstPartOnly = false
}) => {
  const [copied, setCopied] = useState(false);
  
  const command = `npx remotion render src/index.js VideoComposition --props='${JSON.stringify({
    selectedVideos,
    videos,
    selectedTags
  })}' --codec=h264 ${outputFileName}`;

  const truncatedCommand = command.slice(0, 50) + '...';

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="render-command">
      <div className="command-container">
        <pre className="command-text">{truncatedCommand}</pre>
        <button className="copy-button" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
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