import React, { useState, useEffect } from 'react';
import { Composition } from 'remotion';
import { useParams } from 'react-router-dom';
import Layout from './Layout';
import { Player } from '@remotion/player';
import { AbsoluteFill, Video, Sequence } from 'remotion';
import './ViewFilm.css';
import { RenderCommand } from './RenderCommand';

export const calculateTotalDuration = (selectedTags) => {
  const tagArray = Array.from(selectedTags);
  const totalFrames = tagArray.reduce((total, tagInfo) => {
    const duration = parseInt(tagInfo.endFrame || '0', 10) - parseInt(tagInfo.startFrame || '0', 10);
    return total + duration;
  }, 0);
  return totalFrames * 2;
};

export const VideoPreviewThenBackToBack = ({ selectedVideos, videos, selectedTags }) => { 
  const tagArray = Array.from(selectedTags);

  return (
      <AbsoluteFill>
        <Sequence from={0} durationInFrames={10 * 30}>
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

        {tagArray.map((tagInfo, index) => {
          const video = videos.find(v => v.id === tagInfo.videoId);
          if (!video) return null;
          
          const durationOfPreview = 30 * 10;
          const tagsBefore = tagArray.slice(0, index);
          const startFrame = tagsBefore.reduce((total, tag) => {
            return total + (parseInt(tag.endFrame, 10) - parseInt(tag.startFrame, 10));
          }, durationOfPreview);

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

export const VideoFirstFiveSeconds = ({ selectedVideos, videos, selectedTags }) => {
  const tagArray = Array.from(selectedTags);

  return (
    <AbsoluteFill>
      {tagArray.map((tagInfo, index) => {
        const video = videos.find(v => v.id === tagInfo.videoId);
        if (!video) return null;

        return (
          <Sequence
            key={tagInfo.key}
            from={index * 5 * 30} // 5 seconds per clip
            durationInFrames={5 * 30} // 5 seconds
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
                  endAt={parseInt(tagInfo.startFrame, 10) + 5 * 30} // First 5 seconds
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
  const [selectedTemplate, setSelectedTemplate] = useState('VideoPreviewThenBackToBack');

  useEffect(() => {
    fetchFilm();
    fetchVideos();
  }, [id]);

  useEffect(() => {
    if (videos.length > 0) {
      setSelectedTags(new Set());
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
      key: `${videoId}-${tagName}-${frame}-${startFrame}-${endFrame}`,
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
      const existingTag = Array.from(newSet).find(t => 
        t.videoId === tagInfo.videoId && 
        t.tagName === tagInfo.tagName && 
        t.frame === tagInfo.frame &&
        t.startFrame === tagInfo.startFrame &&
        t.endFrame === tagInfo.endFrame
      );
      
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

  const renderPlayerComponent = () => {
    switch (selectedTemplate) {
      case 'VideoPreviewThenBackToBack':
        return VideoPreviewThenBackToBack;
      case 'VideoFirstFiveSeconds':
        return VideoFirstFiveSeconds;
      default:
        return VideoPreviewThenBackToBack;
    }
  };

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
        
        <div className="template-selector">
          <label htmlFor="template-select">Select Video Template: </label>
          <select
            id="template-select"
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
          >
            <option value="VideoPreviewThenBackToBack">Preview Then Back-to-Back</option>
            <option value="VideoFirstFiveSeconds">First 5 Seconds of Each Clip</option>
          </select>
        </div>

        <div className="video-player">
          {selectedVideos.size > 0 ? (
            <>
              <Player
                component={renderPlayerComponent()}
                inputProps={{
                  selectedVideos,
                  videos,
                  selectedTags
                }}
                durationInFrames={calculateTotalDuration(selectedTags) + 10 * 30}
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
              <RenderCommand 
                selectedVideos={Array.from(selectedVideos)}
                videos={videos}
                selectedTags={Array.from(selectedTags)}
                outputFileName={`${film.name.replace(/\s+/g, '_')}.mp4`}
                durationInFrames={calculateTotalDuration(selectedTags) + 10 * 30}
                fps={30}
                width={1280}
                height={720}
                showFirstPartOnly={true}
              />
            </>
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
                    const tagKey = `${video.id}-${tag.name}-${tag.frame}-${tag.startFrame}-${tag.endFrame}`;
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
