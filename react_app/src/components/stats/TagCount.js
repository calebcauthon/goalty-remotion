import React from 'react';
import { calculateTotalTags } from './statUtils';

function TagCount({ video }) {
  if (!video) return null;

  const tagCount = calculateTotalTags(video);

  return (
    <div className="stat-card">
      <h3>Tag Count</h3>
      <div className="stat-value">{tagCount}</div>
    </div>
  );
}

export default TagCount; 