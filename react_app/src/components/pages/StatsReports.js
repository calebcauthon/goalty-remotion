import React, { useState, useEffect, useContext } from 'react';
import Layout from 'components/pages/Layout';
import { GlobalContext } from '../../index';
import TagCount from 'components/stats/TagCount';
import TeamTouchCount from 'components/stats/TeamTouchCount';
import TeamScoreCount from 'components/stats/TeamScoreCount';
import TeamAttackCount from 'components/stats/TeamAttackCount';
import TeamPossessionCount from 'components/stats/TeamPossessionCount';
import TeamAggregateStats from 'components/stats/TeamAggregateStats';
import TeamAttackTouches from 'components/stats/TeamAttackTouches';
import TeamAttackDurations from 'components/stats/TeamAttackDurations';
import GameAggregateStats from 'components/stats/GameAggregateStats';
import './StatsReports.css';
import { statDescriptions } from 'components/stats/statDescriptions';

function StatsReports() {
  const globalData = useContext(GlobalContext);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [gameSequences, setGameSequences] = useState([]);
  const [selectedGameIndex, setSelectedGameIndex] = useState(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/videos/with-tags`);
      const data = await response.json();
      setVideos(data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const handleVideoSelect = (videoId) => {
    const video = videos.find(v => v.id === videoId);
    setSelectedVideo(video);
    
    if (video?.tags) {
      const games = video.tags
        .filter(tag => tag.name === 'game' && tag.startFrame && tag.endFrame)
        .sort((a, b) => a.startFrame - b.startFrame);
      
      setGameSequences(games);
      setSelectedGameIndex(games.length > 0 ? 0 : null);
    }
  };

  const getCurrentGameFrameRange = () => {
    if (selectedGameIndex === null || !gameSequences[selectedGameIndex]) {
      return null;
    }
    const game = gameSequences[selectedGameIndex];
    return {
      startFrame: game.startFrame,
      endFrame: game.endFrame
    };
  };

  return (
    <Layout>
      <div className="stats-container">
        <h1>Stats & Reports</h1>
        
        <div className="video-selection">
          <h2>Select a Video</h2>
          <select 
            onChange={(e) => handleVideoSelect(parseInt(e.target.value))}
            value={selectedVideo?.id || ''}
          >
            <option value="">Choose a video...</option>
            {videos.map(video => (
              <option key={video.id} value={video.id}>
                {video.name}
              </option>
            ))}
          </select>

          {gameSequences.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <select
                onChange={(e) => setSelectedGameIndex(parseInt(e.target.value))}
                value={selectedGameIndex || 0}
              >
                {gameSequences.map((game, index) => (
                  <option key={index} value={index}>
                    Game {index + 1} ({(game.startFrame/30).toFixed(0)}s - {(game.endFrame/30).toFixed(0)}s)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {selectedVideo && (
          <div className="stats-panel">
            <h2>Statistics for {selectedVideo.name}</h2>
            
            <div className="game-summary-section">
              <GameAggregateStats 
                video={selectedVideo} 
                frameRange={getCurrentGameFrameRange()} 
              />
            </div>

            <div className="stats-table">
              <div className="stats-header">
                <div className="stats-cell description-header"></div>
                <div className="stats-cell">Home Team</div>
                <div className="stats-cell">Away Team</div>
              </div>

              <div className="stats-row">
                <div className="stats-cell description-cell">
                  <h4>{statDescriptions.efficiency.title}</h4>
                  <p>{statDescriptions.efficiency.description}</p>
                </div>
                <div className="stats-cell">
                  <TeamAggregateStats video={selectedVideo} team="home" frameRange={getCurrentGameFrameRange()} />
                </div>
                <div className="stats-cell">
                  <TeamAggregateStats video={selectedVideo} team="away" frameRange={getCurrentGameFrameRange()} />
                </div>
              </div>

              <div className="stats-row">
                <div className="stats-cell description-cell">
                  <h4>{statDescriptions.attackLength.title}</h4>
                  <p>{statDescriptions.attackLength.description}</p>
                </div>
                <div className="stats-cell">
                  <TeamAttackTouches video={selectedVideo} team="home" frameRange={getCurrentGameFrameRange()} />
                </div>
                <div className="stats-cell">
                  <TeamAttackTouches video={selectedVideo} team="away" frameRange={getCurrentGameFrameRange()} />
                </div>
              </div>

              <div className="stats-row">
                <div className="stats-cell description-cell">
                  <h4>{statDescriptions.attackDuration.title}</h4>
                  <p>{statDescriptions.attackDuration.description}</p>
                </div>
                <div className="stats-cell">
                  <TeamAttackDurations video={selectedVideo} team="home" frameRange={getCurrentGameFrameRange()} />
                </div>
                <div className="stats-cell">
                  <TeamAttackDurations video={selectedVideo} team="away" frameRange={getCurrentGameFrameRange()} />
                </div>
              </div>

              <div className="stats-row">
                <div className="stats-cell description-cell">
                  <h4>{statDescriptions.touches.title}</h4>
                  <p>{statDescriptions.touches.description}</p>
                </div>
                <div className="stats-cell">
                  <TeamTouchCount video={selectedVideo} team="home" frameRange={getCurrentGameFrameRange()} />
                </div>
                <div className="stats-cell">
                  <TeamTouchCount video={selectedVideo} team="away" frameRange={getCurrentGameFrameRange()} />
                </div>
              </div>

              <div className="stats-row">
                <div className="stats-cell description-cell">
                  <h4>{statDescriptions.possessions.title}</h4>
                  <p>{statDescriptions.possessions.description}</p>
                </div>
                <div className="stats-cell">
                  <TeamPossessionCount video={selectedVideo} team="home" frameRange={getCurrentGameFrameRange()} />
                </div>
                <div className="stats-cell">
                  <TeamPossessionCount video={selectedVideo} team="away" frameRange={getCurrentGameFrameRange()} />
                </div>
              </div>

              <div className="stats-row">
                <div className="stats-cell description-cell">
                  <h4>{statDescriptions.scores.title}</h4>
                  <p>{statDescriptions.scores.description}</p>
                </div>
                <div className="stats-cell">
                  <TeamScoreCount video={selectedVideo} team="home" frameRange={getCurrentGameFrameRange()} />
                </div>
                <div className="stats-cell">
                  <TeamScoreCount video={selectedVideo} team="away" frameRange={getCurrentGameFrameRange()} />
                </div>
              </div>

              <div className="stats-row">
                <div className="stats-cell description-cell">
                  <h4>{statDescriptions.attacks.title}</h4>
                  <p>{statDescriptions.attacks.description}</p>
                </div>
                <div className="stats-cell">
                  <TeamAttackCount video={selectedVideo} team="home" frameRange={getCurrentGameFrameRange()} />
                </div>
                <div className="stats-cell">
                  <TeamAttackCount video={selectedVideo} team="away" frameRange={getCurrentGameFrameRange()} />
                </div>
              </div>
            </div>

            <div className="overall-stats">
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default StatsReports; 