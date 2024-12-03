import React from 'react';
import { calculateTeamAggregateStats } from './statUtils';

function TeamAggregateStats({ video, team, frameRange }) {
  if (!video) return null;

  const stats = calculateTeamAggregateStats(video, team, frameRange);
  if (!stats) return null;

  const teamName = team === 'home' ? 'Home' : 'Away';

  return (
    <div className="stat-card">
      <h3>{teamName} Team Efficiency</h3>
      <div className="stat-value">
        {stats.scores}/{stats.attacks} ({stats.scoringPercentage}%)
        <div className="stat-subtext">
          {stats.clearingTurnovers} clearing turnovers
        </div>
      </div>
    </div>
  );
}

export default TeamAggregateStats; 