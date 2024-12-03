import React from 'react';
import { calculateTeamAttacks } from './statUtils';

function TeamAttackCount({ video, team, frameRange }) {
  if (!video) return null;

  const attackCount = calculateTeamAttacks(video, team, frameRange);
  const teamName = team === 'home' ? 'Home' : 'Away';

  return (
    <div className="stat-card">
      <h3>{teamName} Team Attacks</h3>
      <div className="stat-value">{attackCount}</div>
    </div>
  );
}

export default TeamAttackCount; 