import React from 'react';

function TagCount({ video }) {
  if (!video) return null;

  return (
    <div className="stat-card">
      <h3>Tag Count</h3>
      <div className="stat-value">{video.tags.length}</div>
    </div>
  );
}

export default TagCount; 