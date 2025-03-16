import React, { useState, useEffect, useContext, useRef } from 'react';
import Layout from 'components/pages/Layout';
import 'components/pages/ClipMaker.css';
import PlayingTimeProcessor from 'components/processing/PlayingTimeProcessor';
import TurnoverProcessor from 'components/processing/TurnoverProcessor';
import AttackSequenceProcessor from 'components/processing/AttackSequenceProcessor';
import PlayerSequenceProcessor from 'components/processing/PlayerSequenceProcessor';
import GameProcessor from 'components/processing/GameProcessor';
import ScreenProcessor from 'components/processing/ScreenProcessor';
import { GlobalContext } from '../../index';
import { Player } from '@remotion/player';
import { getVideoMetadata } from '@remotion/media-utils';
import VideoPlayer from 'components/VideoPlayer';
import FrameRangeSlider from 'components/FrameRangeSlider';
import { useLocation } from 'react-router-dom';
import ScoreFinderProcessor from 'components/processing/ScoreFinderProcessor';
import UserAddsTagsDirectly from 'components/processing/UserAddsTagsDirectly';
import SplitPlayingTimeProcessor from 'components/processing/SplitPlayingTimeProcessor';

function ClipMaker() {
  const globalData = useContext(GlobalContext);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [durationInFrames, setDurationInFrames] = useState(30 * 60);
  const [videoMetadata, setVideoMetadata] = useState(null);
  const playerRef = useRef(null);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialVideoId = parseInt(searchParams.get('videoId'));
  const [tagFilter, setTagFilter] = useState('');
  const [previewEndFrame, setPreviewEndFrame] = useState(null);
  const [previewPlaybackRate, setPreviewPlaybackRate] = useState(1);
  const [slowPreviewEndFrame, setSlowPreviewEndFrame] = useState(null);
  const [previewLoopCount, setPreviewLoopCount] = useState(0);
  const [previewStartFrame, setPreviewStartFrame] = useState(null);
  const [previewPending, setPreviewPending] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    if (initialVideoId && videos.length > 0) {
      handleVideoSelect(initialVideoId);
    }
  }, [initialVideoId, videos]);

  const fetchVideos = async () => {
    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/videos/with-tags`);
      const data = await response.json();
      setVideos(data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const refreshVideoData = async () => {
    await fetchVideos();
    if (selectedVideo) {
      const updatedVideos = await (await fetch(`${globalData.APIbaseUrl}/api/videos/with-tags`)).json();
      const refreshedVideo = updatedVideos.find(v => v.id === selectedVideo.id);
      setSelectedVideo(refreshedVideo);
    }
  };

  const handleVideoSelect = async (videoId) => {
    const video = videos.find(v => v.id === videoId);
    setSelectedVideo(video);
    
    if (video) {
      try {
        const metadata = await getVideoMetadata(video.filepath);
        const assumedFps = 29.8;
        metadata.fps = metadata.fps || assumedFps;
        setVideoMetadata(metadata);
        setDurationInFrames(Math.ceil(metadata.durationInSeconds * metadata.fps));
      } catch (error) {
        console.error('Error getting video metadata:', error);
      }
    }
  };

  const handleDeleteTag = async (tagToDelete) => {
    if (!selectedVideo) return;
    
    try {
      // Get existing metadata
      const metadata = selectedVideo.metadata ? JSON.parse(selectedVideo.metadata) : {};
      const existingTags = metadata.tags || [];
      
      // Find the index of the first matching tag
      const tagIndex = existingTags.findIndex(tag => 
        tag.name === tagToDelete.name && 
        tag.frame === tagToDelete.frame &&
        tag.startFrame === tagToDelete.startFrame &&
        tag.endFrame === tagToDelete.endFrame
      );

      if (tagIndex === -1) return; // Tag not found

      // Create new array with the tag removed
      const updatedTags = [
        ...existingTags.slice(0, tagIndex),
        ...existingTags.slice(tagIndex + 1)
      ];

      const response = await fetch(`${globalData.APIbaseUrl}/api/videos/${selectedVideo.id}/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: JSON.stringify({ ...metadata, tags: updatedTags })
        }),
      });

      if (!response.ok) throw new Error('Failed to delete tag');

      // Refresh video data
      await refreshVideoData();
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  const handleTagClick = (frame) => {
    if (playerRef.current) {
      playerRef.current.seekTo(frame);
    }
  };

  const handlePreview = async (startFrame, endFrame) => {
    if (playerRef.current) {
      playerRef.current.seekTo(startFrame);
      playerRef.current.pause();
      setPreviewPending(true);
      setPreviewStartFrame(startFrame);
      setPreviewEndFrame(endFrame);
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
        playerRef.current?.play();
      }, 500);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [previewPending, previewStartFrame]);

  const handleFrameUpdate = (frame) => {
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
        playerRef.current?.pause();
        setPreviewEndFrame(null);
        setPreviewPlaybackRate(1);
        setPreviewLoopCount(0);
        setPreviewStartFrame(null);
      }
    }
  };

  return (
    <Layout>
      <div className="clipmaker-container">
        <h1>Clip Maker</h1>
        
        {/* Video Selection */}
        <div className="video-selection">
          <h2>Select a Video</h2>
          <select 
            onChange={(e) => handleVideoSelect(parseInt(e.target.value))}
            value={selectedVideo?.id || ''}
          >
            <option value="">Choose a video...</option>
            {videos.map(video => (
              <option key={video.id} value={video.id}>
                {video.name} ({video.tags.length} tags)
              </option>
            ))}
          </select>
        </div>

        {/* Add video player after video selection */}
        {selectedVideo && selectedVideo.filepath.includes('backblaze') && (
          <div className="video-player" style={{marginBottom: '20px'}}>
            <Player
              ref={playerRef}
              component={VideoPlayer}
              inputProps={{
                src: selectedVideo.filepath,
                onFrameUpdate: handleFrameUpdate
              }}
              durationInFrames={durationInFrames}
              compositionWidth={800}
              compositionHeight={videoMetadata ? Math.round(800 * (videoMetadata.height / videoMetadata.width)) : 450}
              fps={videoMetadata?.fps || 30}
              playbackRate={previewPlaybackRate}
              controls
              renderLoading={() => <div>Loading...</div>}
            />
          </div>
        )}

        {/* Tags Table */}
        {selectedVideo && (
          <>
            <div className="tags-table-container">
              <h2>Tags for {selectedVideo.name}</h2>
              
              {/* Processor components */}
              <AttackSequenceProcessor
                buttonText="Scoring Possessions (home)"
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
                team="home"
                scoringOnly={true}
                onPreview={handlePreview}
              />
              <AttackSequenceProcessor
                buttonText="Scoring Possessions (away)"
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
                team="away"
                scoringOnly={true}
                onPreview={handlePreview}
              />
              <AttackSequenceProcessor
                buttonText="Scores (home)"
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
                team="home"
                scoringOnly={true}
                maxPrecedingTouches={3}
                onPreview={handlePreview}
              />
              <AttackSequenceProcessor
                buttonText="Scores (away)"
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
                team="away"
                scoringOnly={true}
                maxPrecedingTouches={3}
                onPreview={handlePreview}
              />
              <AttackSequenceProcessor
                buttonText="Attacks (home)"
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
                team="home"
                scoringOnly={false}
                onPreview={handlePreview}
              />
              <AttackSequenceProcessor
                buttonText="Attacks (away)"
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
                team="away"
                scoringOnly={false}
                onPreview={handlePreview}
              />
              
              <TurnoverProcessor
                buttonText="Turnovers (home)"
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
                teamTouchPrefix="home_touch_"
                turnoverTag="home_turnover"
                maxPrecedingTouches={3}
                onPreview={handlePreview}
              />
              <TurnoverProcessor
                buttonText="Turnovers (away)"
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
                teamTouchPrefix="away_touch_"
                turnoverTag="away_turnover"
                maxPrecedingTouches={3}
                onPreview={handlePreview}
              />

              <GameProcessor
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
              />

              <PlayingTimeProcessor
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
              />

              <SplitPlayingTimeProcessor
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
              />

              <ScreenProcessor
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
                onPreview={handlePreview}
              />

              <ScoreFinderProcessor
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
                team="home"
                globalData={globalData}
              />
              <ScoreFinderProcessor
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
                team="away"
                globalData={globalData}
              />

              <PlayerSequenceProcessor
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
                onPreview={handlePreview}
              />

              <UserAddsTagsDirectly
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
                globalData={globalData}
              />

              {/* Move filter section here, just above the table */}
              <div className="tag-filters" style={{ marginBottom: '20px', marginTop: '30px' }}>
                <input
                  type="text"
                  placeholder="Filter tags..."
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  style={{ padding: '5px', width: '200px', marginRight: '10px' }}
                />
                <div className="filter-buttons" style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => setTagFilter('')}
                    className={tagFilter === '' ? 'active' : ''}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setTagFilter('home_touch')}
                    className={tagFilter === 'home_touch' ? 'active' : ''}
                  >
                    Home Touches
                  </button>
                  <button 
                    onClick={() => setTagFilter('away_touch')}
                    className={tagFilter === 'away_touch' ? 'active' : ''}
                  >
                    Away Touches
                  </button>
                  <button 
                    onClick={() => setTagFilter('turnover')}
                    className={tagFilter === 'turnover' ? 'active' : ''}
                  >
                    Turnovers
                  </button>
                  <button 
                    onClick={() => setTagFilter('score')}
                    className={tagFilter === 'score' ? 'active' : ''}
                  >
                    Scores
                  </button>
                  <button 
                    onClick={() => setTagFilter('_in_game')}
                    className={tagFilter === '_in_game' ? 'active' : ''}
                  >
                    Player Sequences
                  </button>
                </div>
              </div>

              <p>FPS used: {videoMetadata?.fps || 30}</p>
              <table className="tags-table">
                <thead>
                  <tr>
                    <th>Tag Name</th>
                    <th>Frame Range</th>
                    <th>Time Range</th>
                    <th>Frame</th>
                    <th>Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...selectedVideo.tags]
                    .sort((a, b) => (a.frame || 0) - (b.frame || 0))
                    .filter(tag => tag.name.toLowerCase().includes(tagFilter.toLowerCase()))
                    .map((tag, index) => (
                    <tr key={index}>
                      <td>{tag.name}</td>
                      <td 
                        style={{cursor: 'pointer', textDecoration: 'underline'}}
                        onClick={() => handleTagClick(tag.startFrame || tag.frame)}
                      >
                        {tag.startFrame}-{tag.endFrame}
                      </td>
                      <td>
                        {tag.startFrame && tag.endFrame ? (
                          <FrameRangeSlider
                            startFrame={tag.startFrame}
                            endFrame={tag.endFrame}
                            onFrameSelect={handleTagClick}
                            fps={videoMetadata?.fps || 30}
                          />
                        ) : (
                          <>
                            {tag.startFrame ? `${(tag.startFrame / 30).toFixed(2)}s` : ''}-
                            {tag.endFrame ? `${(tag.endFrame / 30).toFixed(2)}s` : ''}
                          </>
                        )}
                      </td>
                      <td 
                        style={tag.frame ? {cursor: 'pointer', textDecoration: 'underline'} : {}}
                        onClick={() => tag.frame && handleTagClick(tag.frame)}
                      >
                        {tag.frame}
                      </td>
                      <td>{tag.frame ? `${(tag.frame / 30).toFixed(2)}s` : ''}</td>
                      <td>
                        <button 
                          className="delete-button"
                          onClick={() => handleDeleteTag(tag)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

export default ClipMaker;
