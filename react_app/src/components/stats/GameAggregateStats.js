import React from 'react';
import { calculateGameAggregateStats } from './statUtils';

function GameAggregateStats({ video, frameRange }) {
  if (!video) return null;

  const stats = calculateGameAggregateStats(video, frameRange);
  if (!stats) return null;

  const winner = stats.homeScore > stats.awayScore ? 'Home' : 'Away';
  const duration = Math.round(stats.durationInSeconds);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return (
    <div className="stat-card">
      <h3>Game Summary</h3>
      <div className="stat-value">
        {winner} won {stats.homeScore} to {stats.awayScore}
        <div className="stat-subtext">
          Game lasted {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
      </div>
    </div>
  );
}

export default GameAggregateStats; 