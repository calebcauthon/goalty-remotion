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
import { Player } from '@remotion/player';
import { VideoFirstFiveSeconds } from 'components/templates';
import TrackSequenceButton from 'components/stats/TrackSequenceButton';

const calculateVideoDuration = (video) => {
  if (!video?.tags || video.tags.length === 0) return 3000; // default duration
  
  return Math.max(...video.tags.flatMap(tag => [
    tag.frame || 0,
    tag.startFrame || 0,
    tag.endFrame || 0
  ]));
};

const createFullVideoTag = (video) => {
  if (!video) return null;
  const duration = calculateVideoDuration(video);
  
  return {
    key: `${video.id}-full-video-0-${duration}`,
    videoId: video.id,
    videoName: video.name,
    videoFilepath: video.filepath,
    tagName: 'full_video',
    frame: 0,
    startFrame: 0,
    endFrame: duration
  };
};

const formatFrameToTime = (frame) => {
  const totalSeconds = frame / 30;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const getSequenceResult = (sequence) => {
  const hasScore = sequence.touches.some(touch => touch.name === 'score');
  return hasScore ? '🏆 Score' : '❌ No Score';
};

const DetectionsTable = ({ detections, onRemove, onHover }) => {
  return (
    <div className="detections-table-container">
      <h3>Detected Objects</h3>
      <table className="detections-table">
        <thead>
          <tr>
            <th>Label</th>
            <th>Confidence</th>
            <th>Position</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {detections.map((detection, index) => (
            <tr 
              key={index}
              onMouseEnter={() => onHover(index)}
              onMouseLeave={() => onHover(null)}
            >
              <td>{detection.label}</td>
              <td>{(detection.confidence * 100).toFixed(1)}%</td>
              <td>
                x: {detection.x.toFixed(0)}, y: {detection.y.toFixed(0)},
                w: {detection.width.toFixed(0)}, h: {detection.height.toFixed(0)}
              </td>
              <td>
                <button 
                  onClick={() => onRemove(index)}
                  className="remove-detection-btn"
                >
                  ❌
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

function StatsReports() {
  const globalData = useContext(GlobalContext);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [gameSequences, setGameSequences] = useState([]);
  const [selectedGameIndex, setSelectedGameIndex] = useState(null);
  const [playerRef, setPlayerRef] = useState(null);
  const [previewEndFrame, setPreviewEndFrame] = useState(null);
  const [previewStartFrame, setPreviewStartFrame] = useState(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [selectedPossessionData, setSelectedPossessionData] = useState(null);
  const [previewPlaybackRate, setPreviewPlaybackRate] = useState(1);
  const [previewLoopCount, setPreviewLoopCount] = useState(0);
  const [slowPreviewEndFrame, setSlowPreviewEndFrame] = useState(null);
  const [previewPending, setPreviewPending] = useState(false);
  const [currentPlayingSequence, setCurrentPlayingSequence] = useState(null);
  const [lastPlayedSequence, setLastPlayedSequence] = useState(null);
  const [clipResults, setClipResults] = useState(null);
  const [showFrameImage, setShowFrameImage] = useState(true);
  const [hoveredDetectionIndex, setHoveredDetectionIndex] = useState(null);
  const [validDetections, setValidDetections] = useState([]);
  const [detections, setDetections] = useState(null);

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

  useEffect(() => {
    setSelectedPossessionData(null);
  }, [selectedVideo, selectedGameIndex]);

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

  const handleFrameUpdate = (frame) => {
    setCurrentFrame(frame);
    
    if (previewEndFrame) {
      // Handle slow preview loops
      if (previewLoopCount < 5 && slowPreviewEndFrame && frame >= slowPreviewEndFrame) {
        setPreviewLoopCount(prev => prev + 1);
        setSlowPreviewEndFrame(frame + 2);
        setPreviewPlaybackRate(0.2);
      }
      
      // After 3 loops, play at normal speed
      if (previewLoopCount >= 3 && slowPreviewEndFrame) {
        setPreviewPlaybackRate(1);
        setSlowPreviewEndFrame(null);
      }
      
      // Stop at end
      if (frame >= previewEndFrame) {
        playerRef?.pause();
        setPreviewEndFrame(null);
        setPreviewPlaybackRate(1);
        setPreviewLoopCount(0);
        setPreviewStartFrame(null);
        setCurrentPlayingSequence(null);
      }
    }
  };

  const handlePossessionSelect = (data) => {
    console.log('Possession clicked:', data);
    setSelectedPossessionData(data);
    if (data.sequences?.[0]) {
      const sequence = data.sequences[0];
      if (playerRef) {
        playerRef.seekTo(sequence.startFrame);
        setPreviewStartFrame(sequence.startFrame);
        setPreviewEndFrame(sequence.endFrame);
        playerRef.play();
      }
    }
  };

  const handlePlaySequence = (sequence) => {
    if (playerRef) {
      playerRef.seekTo(sequence.startFrame);
      playerRef.pause();
      setPreviewPending(true);
      setPreviewStartFrame(sequence.startFrame);
      setPreviewEndFrame(sequence.endFrame);
      setCurrentPlayingSequence(sequence);
      setLastPlayedSequence(sequence);
    }
  };

  useEffect(() => {
    let timeoutId;
    if (previewPending) {
      timeoutId = setTimeout(() => {
        setPreviewPending(false);
        setPreviewLoopCount(0);
        setPreviewPlaybackRate(0.2);
        setSlowPreviewEndFrame(previewStartFrame + 2);
        playerRef?.play();
      }, 500);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [previewPending, previewStartFrame]);

  const handleClipResults = (results) => {
    console.log(`clipResults`, { results });
    setClipResults(results);
    setValidDetections(results.detections || []);
    setDetections(results.detections || []);
    // Seek video to the frame where CLIP analysis was done
    if (playerRef) {
      playerRef.currentTime = results.frame / 30; // Assuming 30fps
    }
  };

  const handleRemoveDetection = (index) => {
    setClipResults(prev => ({
      ...prev,
      detections: prev.detections.filter((_, i) => i !== index)
    }));
    setValidDetections(prev => prev.filter((_, i) => i !== index));
    setDetections(prev => prev.filter((_, i) => i !== index));
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
          <div className="video-player" style={{ marginBottom: '2rem' }}>
            <div className="video-container">
              <div className="video-controls">
                {clipResults && (
                  <button
                    onClick={() => setShowFrameImage(!showFrameImage)}
                    className="toggle-frame-button"
                  >
                    {showFrameImage ? 'Show Video' : 'Show Analysis Frame'}
                  </button>
                )}
              </div>
              <Player
                ref={setPlayerRef}
                component={VideoFirstFiveSeconds}
                inputProps={{
                  selectedVideos: new Set([selectedVideo.id]),
                  videos: [selectedVideo],
                  selectedTags: new Set([createFullVideoTag(selectedVideo)]),
                  onFrameUpdate: handleFrameUpdate,
                  detections: detections || [],
                  frameImage: showFrameImage ? clipResults?.frameImage : null,
                  hoveredDetectionIndex
                }}
                durationInFrames={calculateVideoDuration(selectedVideo)}
                compositionWidth={1280}
                compositionHeight={720}
                fps={30}
                controls
                loop={!previewEndFrame}
                playbackRate={previewPlaybackRate}
                style={{
                  width: '100%',
                  //aspectRatio: '16/9'
                }}
              />
            </div>
            {selectedPossessionData && (
              <div className="sequences-table-container">
                <h3>{selectedPossessionData.team === 'home' ? 'Home' : 'Away'} Team Possession Sequences</h3>
                <table className="sequences-table">
                  <thead>
                    <tr>
                      <th>Sequence</th>
                      <th>Start Time</th>
                      <th>End Time</th>
                      <th>Duration</th>
                      <th>Touch Count</th>
                      <th>Result</th>
                      <th>Actions</th>
                      <th>Clip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPossessionData.sequences.map((sequence, index) => (
                      <tr 
                        key={index} 
                        className={`${lastPlayedSequence === sequence ? 'last-played' : ''} ${
                          currentPlayingSequence === sequence ? 'currently-playing' : ''
                        }`}
                      >
                        <td>{index + 1}</td>
                        <td>{formatFrameToTime(sequence.startFrame)}</td>
                        <td>{formatFrameToTime(sequence.endFrame)}</td>
                        <td className="duration-cell">
                          <div className="duration-content">
                            <span>{((sequence.endFrame - sequence.startFrame) / 30).toFixed(1)}s</span>
                            {currentPlayingSequence === sequence && (
                              <div className="clip-progress">
                                <div 
                                  className="progress-bar"
                                  style={{
                                    width: `${Math.round(((currentFrame - sequence.startFrame) / (sequence.endFrame - sequence.startFrame)) * 100)}%`
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td>{sequence.touches.length}</td>
                        <td className={`result-cell ${getSequenceResult(sequence).includes('Score') ? 'score' : 'no-score'}`}>
                          {getSequenceResult(sequence)}
                        </td>
                        <td>
                          <button 
                            onClick={() => handlePlaySequence(sequence)}
                            className={`play-sequence-button ${currentPlayingSequence === sequence ? 'playing' : ''}`}
                          >
                            {currentPlayingSequence === sequence ? '🔄' : '▶️'} 
                          </button>
                        </td>
                        <td>
                          <TrackSequenceButton 
                            sequence={sequence}
                            video={selectedVideo}
                            onClipResults={handleClipResults}
                            validDetections={validDetections}
                            detections={detections}
                            setDetections={setDetections}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

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
                  <TeamPossessionCount 
                    video={selectedVideo} 
                    team="home" 
                    frameRange={getCurrentGameFrameRange()}
                    onSelect={handlePossessionSelect}
                  />
                </div>
                <div className="stats-cell">
                  <TeamPossessionCount 
                    video={selectedVideo} 
                    team="away" 
                    frameRange={getCurrentGameFrameRange()}
                    onSelect={handlePossessionSelect} 
                  />
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
      {clipResults && (
        <DetectionsTable 
          detections={detections || []}
          onRemove={handleRemoveDetection}
          onHover={setHoveredDetectionIndex}
        />
      )}
    </Layout>
  );
}

export default StatsReports; 