import React from 'react';
import { calculateTeamAttackDurations } from './statUtils';

function TeamAttackDurations({ video, team }) {
  if (!video) return null;

  const stats = calculateTeamAttackDurations(video, team);
  if (!stats) return null;

  const teamName = team === 'home' ? 'Home' : 'Away';

  return (
    <div className="stat-card">
      <h3>{teamName} Team Attack Duration</h3>
      <div className="stat-value">
        <div>
          Scoring: {stats.scoring.averageSeconds}s/attack
          <div className="stat-subtext">
            {stats.scoring.totalSeconds}s total in {stats.scoring.attackCount} scoring attacks
          </div>
        </div>
        <div style={{ marginTop: '10px' }}>
          Non-Scoring: {stats.nonScoring.averageSeconds}s/attack
          <div className="stat-subtext">
            {stats.nonScoring.totalSeconds}s total in {stats.nonScoring.attackCount} non-scoring attacks
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeamAttackDurations; 