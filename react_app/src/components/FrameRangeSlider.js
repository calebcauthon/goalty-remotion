import React from 'react';

function FrameRangeSlider({ startFrame, endFrame, onFrameSelect, fps = 30 }) {
  return (
    <div className="range-slider-container">
      <span>{(startFrame / fps).toFixed(2)}s-{(endFrame / fps).toFixed(2)}s</span>
      <input
        type="range"
        min={startFrame}
        max={endFrame}
        defaultValue={startFrame}
        onChange={(e) => onFrameSelect(parseInt(e.target.value))}
        className="frame-range-slider"
      />
    </div>
  );
}

export default FrameRangeSlider; 