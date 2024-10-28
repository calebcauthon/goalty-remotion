import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from './Layout';
import { Player } from '@remotion/player';
import { AbsoluteFill, Video, Sequence } from 'remotion';
import './ViewFilm.css';

// Add export at the top with the function
export const calculateTotalDuration = (selectedTags) => {
  const tagArray = Array.from(selectedTags);
  
  // Calculate total duration from all selected tags
  const totalFrames = tagArray.reduce((total, tagInfo) => {
    const duration = parseInt(tagInfo.endFrame || '0', 10) - parseInt(tagInfo.startFrame || '0', 10);
    return total + duration;
  }, 0);

  // Return total frames for all segments (all videos together + individual segments)
  return totalFrames * 2; // Multiply by 2 because we show all videos together and then individually
};

// Updated VideoPlayer component using Remotion Video
const VideoPlayer = ({ selectedVideos, videos, selectedTags }) => { 
  const tagArray = Array.from(selectedTags);

  return (
    <AbsoluteFill>
      {/* First sequence: All videos together */}
      <Sequence from={0} durationInFrames={calculateTotalDuration(selectedTags)}>
        <AbsoluteFill>
          {tagArray.map((tagInfo, index) => {
            const video = videos.find(v => v.id === tagInfo.videoId);
            if (!video) return null;
            
            const columns = Math.min(selectedVideos.size, 2);
            const width = 100 / columns;
            const row = Math.floor(index / columns);
            const col = index % columns;
            
            return (
              <div
                key={tagInfo.key}
                style={{
                  position: 'absolute',
                  left: `${col * width}%`,
                  top: `${row * 50}%`,
                  width: `${width}%`,
                  height: '50%',
                  padding: '10px'
                }}
              >
                <p className="video-name">
                  {`${video.name} - ${tagInfo.tagName} (${tagInfo.startFrame}-${tagInfo.endFrame})`}
                </p>
                <Video
                  src={`http://localhost:5000/downloads/${video.filepath.split('/').pop()}`}
                  startFrom={parseInt(tagInfo.startFrame || '0', 10)}
                  endAt={parseInt(tagInfo.endFrame || '0', 10)}
                  style={{
                    width: '100%',
                    height: '90%'
                  }}
                />
              </div>
            );
          })}
        </AbsoluteFill>
      </Sequence>

      {/* Individual video sequences */}
      {tagArray.map((tagInfo, index) => {
        const video = videos.find(v => v.id === tagInfo.videoId);
        if (!video) return null;
        
        const startFrame = tagArray.slice(0, index).reduce((total, tag) => {
          return total + (parseInt(tag.endFrame, 10) - parseInt(tag.startFrame, 10));
        }, calculateTotalDuration(selectedTags));

        const tagDuration = parseInt(tagInfo.endFrame, 10) - parseInt(tagInfo.startFrame, 10);
        
        return (
          <Sequence
            key={tagInfo.key}
            from={startFrame}
            durationInFrames={tagDuration}
          >
            <AbsoluteFill>
              <div
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  padding: '10px'
                }}
              >
                <p className="video-name">
                  {`${video.name} - ${tagInfo.tagName} (${tagInfo.startFrame}-${tagInfo.endFrame})`}
                </p>
                <Video
                  src={`http://localhost:5000/downloads/${video.filepath.split('/').pop()}`}
                  startFrom={parseInt(tagInfo.startFrame, 10)}
                  endAt={parseInt(tagInfo.endFrame, 10)}
                  style={{
                    width: '100%',
                    height: '90%'
                  }}
                />
              </div>
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

function ViewFilm() {
  const [film, setFilm] = useState(null);
  const [videos, setVideos] = useState([]);
  const { id } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [selectedVideos, setSelectedVideos] = useState(new Set());
  const [selectedTags, setSelectedTags] = useState(new Set());

  useEffect(() => {
    fetchFilm();
    fetchVideos();
  }, [id]);

  // Initialize selected tags when videos are loaded
  useEffect(() => {
    if (videos.length > 0) {
      const allTags = new Set(
        videos.flatMap(video => 
          video.tags
            .filter(tag => tag.startFrame && tag.endFrame) // Only include tags with frame ranges
            .map(tag => ({
              key: `${video.id}-${tag.name}-${tag.frame}`,
              videoId: video.id,
              videoName: video.name,
              videoFilepath: video.filepath,
              tagName: tag.name,
              frame: tag.frame,
              startFrame: tag.startFrame,
              endFrame: tag.endFrame
            }))
      ));
      setSelectedTags(allTags);
    }
  }, [videos]);

  const fetchFilm = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/films/${id}`);
      const data = await response.json();
      setFilm(data);
    } catch (error) {
      console.error('Error fetching film:', error);
    }
  };

  const fetchVideos = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/videos/with-tags');
      const data = await response.json();
      setVideos(data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const handleSaveTitle = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/films/${id}/name`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editedName }),
      });
      
      if (response.ok) {
        setFilm({ ...film, name: editedName });
        setIsEditing(false);
      } else {
        console.error('Failed to update film name');
      }
    } catch (error) {
      console.error('Error updating film name:', error);
    }
  };

  const handleVideoToggle = (videoId) => {
    setSelectedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  const handleTagToggle = (videoId, tagName, frame, videoName, videoFilepath, startFrame, endFrame) => {
    const tagInfo = {
      key: `${videoId}-${tagName}-${frame}`,
      videoId,
      videoName,
      videoFilepath,
      tagName,
      frame,
      startFrame,
      endFrame
    };
    
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      const existingTag = Array.from(newSet).find(t => t.key === tagInfo.key);
      
      if (existingTag) {
        newSet.delete(existingTag);
      } else {
        newSet.add(tagInfo);
      }
      return newSet;
    });
  };

  if (!film) {
    return <Layout>Loading...</Layout>;
  }

  return (
    <Layout>
      <div className="view-film">
        <div className="film-title">
          {isEditing ? (
            <div className="edit-title">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                autoFocus
              />
              <span 
                className="save-icon"
                onClick={handleSaveTitle}
                title="Save"
              >
                💾
              </span>
            </div>
          ) : (
            <h1>
              {film.name}
              <span 
                className="edit-icon"
                onClick={() => {
                  setIsEditing(true);
                  setEditedName(film.name);
                }}
                title="Edit"
              >
                ✏️
              </span>
            </h1>
          )}
        </div>
        
        <div className="video-player">
          {selectedVideos.size > 0 ? (
            <Player
              component={VideoPlayer}
              inputProps={{
                selectedVideos,
                videos,
                selectedTags
              }}
              durationInFrames={calculateTotalDuration(selectedTags)}
              compositionWidth={1280}
              compositionHeight={720}
              fps={30}
              controls
              loop
              style={{
                width: '100%',
                aspectRatio: '16/9'
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: 360,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}>
              Please select a video
            </div>
          )}
        </div>

        <div className="video-table-container">
          <h2>Videos</h2>
          <table className="video-table">
            <thead>
              <tr>
                <th>Show</th>
                <th>Video Name</th>
                <th>Number of Tags</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => (
                <tr key={video.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedVideos.has(video.id)}
                      onChange={() => handleVideoToggle(video.id)}
                    />
                  </td>
                  <td>{video.name}</td>
                  <td>{video.tags.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="tags-table-container">
          <h2>All Tags</h2>
          <table className="tags-table">
            <thead>
              <tr>
                <th>Show</th>
                <th>Video Name</th>
                <th>Tag Name</th>
                <th>Frame</th>
                <th>Frame Range</th>
              </tr>
            </thead>
            <tbody>
              {videos
                .filter(video => selectedVideos.has(video.id))
                .flatMap((video) =>
                  video.tags.map((tag, index) => {
                    const tagKey = `${video.id}-${tag.name}-${tag.frame}`;
                    const isSelected = Array.from(selectedTags).some(t => t.key === tagKey);
                    const hasFrameRange = tag.startFrame && tag.endFrame;
                    
                    return (
                      <tr key={`${video.id}-${index}`}>
                        <td>
                          {hasFrameRange ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleTagToggle(
                                video.id,
                                tag.name,
                                tag.frame,
                                video.name,
                                video.filepath,
                                tag.startFrame,
                                tag.endFrame
                              )}
                            />
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td>{video.name}</td>
                        <td>{tag.name}</td>
                        <td>{tag.frame}</td>
                        <td>{hasFrameRange ? `${tag.startFrame}-${tag.endFrame}` : 'No range'}</td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

export default ViewFilm;
