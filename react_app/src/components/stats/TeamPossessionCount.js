import React from 'react';
import { calculateTeamPossessions } from './statUtils';

function TeamPossessionCount({ video, team, frameRange, onSelect }) {
  if (!video) return null;

  const { count: possessionCount, sequences } = calculateTeamPossessions(video, team, frameRange);
  const teamName = team === 'home' ? 'Home' : 'Away';

  const handleClick = () => {
    onSelect?.({
      team,
      count: possessionCount,
      sequences,
      frameRange
    });
  };

  return (
    <div className="stat-card" onClick={handleClick} style={{cursor: 'pointer'}}>
      <h3>{teamName} Team Possessions</h3>
      <div className="stat-value">{possessionCount}</div>
    </div>
  );
}

export default TeamPossessionCount; 