import React, { useState, useEffect, useContext, useRef } from 'react';
import Layout from 'components/pages/Layout';
import 'components/pages/ClipMaker.css';
import ScoringPossessionProcessor from 'components/processing/ScoringPossessionProcessor';
import PlayingTimeProcessor from 'components/processing/PlayingTimeProcessor';
import { GlobalContext } from '../../index';
import { Player } from '@remotion/player';
import { getVideoMetadata } from '@remotion/media-utils';
import VideoPlayer from 'components/VideoPlayer';
import FrameRangeSlider from 'components/FrameRangeSlider';

function ClipMaker() {
  const globalData = useContext(GlobalContext);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [durationInFrames, setDurationInFrames] = useState(30 * 60);
  const [videoMetadata, setVideoMetadata] = useState(null);
  const playerRef = useRef(null);

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
        const assumedFps = 30;
        metadata.fps = assumedFps;
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
                onFrameUpdate: () => {}
              }}
              durationInFrames={durationInFrames}
              compositionWidth={800}
              compositionHeight={videoMetadata ? Math.round(800 * (videoMetadata.height / videoMetadata.width)) : 450}
              fps={videoMetadata?.fps || 30}
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
              <ScoringPossessionProcessor 
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
                startTagName="home_touch_attacking"
                endTagName="score"
                excludeTagName={["away_touch_clearing"]}
                outputTagName="home_scoring_possession"
                buttonText="Find Clips: Successful Attacks by Home Team"
              />
              <ScoringPossessionProcessor 
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
                startTagName="game_start"
                endTagName="game_end"
                excludeTagName={["game_end"]}
                outputTagName="full_game"
                buttonText="Find Clips: Games"
              />
              <PlayingTimeProcessor
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
                />
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
