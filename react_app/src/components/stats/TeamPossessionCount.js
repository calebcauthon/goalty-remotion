import React from 'react';
import { calculateTeamPossessions } from './statUtils';

function TeamPossessionCount({ video, team }) {
  if (!video) return null;

  const possessionCount = calculateTeamPossessions(video, team);
  const teamName = team === 'home' ? 'Home' : 'Away';

  return (
    <div className="stat-card">
      <h3>{teamName} Team Possessions</h3>
      <div className="stat-value">{possessionCount}</div>
    </div>
  );
}

export default TeamPossessionCount; 