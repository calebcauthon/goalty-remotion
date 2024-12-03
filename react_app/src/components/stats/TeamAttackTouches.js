import React from 'react';
import { calculateTeamAttackTouches } from './statUtils';

function TeamAttackTouches({ video, team, frameRange }) {
  if (!video) return null;

  const stats = calculateTeamAttackTouches(video, team, frameRange);
  if (!stats) return null;

  const teamName = team === 'home' ? 'Home' : 'Away';

  return (
    <div className="stat-card">
      <h3>{teamName} Team Attack Length</h3>
      <div className="stat-value">
        <div>
          Scoring: {stats.scoring.averageTouches} touches/attack
          <div className="stat-subtext">
            {stats.scoring.totalTouches} touches in {stats.scoring.attackCount} scoring attacks
          </div>
        </div>
        <div style={{ marginTop: '10px' }}>
          Non-Scoring: {stats.nonScoring.averageTouches} touches/attack
          <div className="stat-subtext">
            {stats.nonScoring.totalTouches} touches in {stats.nonScoring.attackCount} non-scoring attacks
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeamAttackTouches; 