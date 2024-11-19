import React from 'react';
import { calculateTeamScores } from './statUtils';

function TeamScoreCount({ video, team }) {
  if (!video) return null;

  const scoreCount = calculateTeamScores(video, team);
  const teamName = team === 'home' ? 'Home' : 'Away';

  return (
    <div className="stat-card">
      <h3>{teamName} Team Scores</h3>
      <div className="stat-value">{scoreCount}</div>
    </div>
  );
}

export default TeamScoreCount; 