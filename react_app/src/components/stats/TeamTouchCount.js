import React from 'react';
import { calculateTeamTouches } from './statUtils';

function TeamTouchCount({ video, team }) {
  if (!video) return null;

  const touchCount = calculateTeamTouches(video, team);
  const teamName = team === 'home' ? 'Home' : 'Away';

  return (
    <div className="stat-card">
      <h3>{teamName} Team Touches</h3>
      <div className="stat-value">{touchCount}</div>
    </div>
  );
}

export default TeamTouchCount; 