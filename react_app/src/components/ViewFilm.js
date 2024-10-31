import React, { useState, useEffect } from 'react';
import { Composition } from 'remotion';
import { useParams } from 'react-router-dom';
import Layout from './Layout';
import { Player } from '@remotion/player';
import { AbsoluteFill, Video, Sequence } from 'remotion';
import './ViewFilm.css';
import { RenderCommand } from './RenderCommand';
import { 
  VideoPreviewThenBackToBack, 
  VideoFirstFiveSeconds,
  calculatePreviewThenBackToBackDuration,
  calculateFirstFiveSecondsDuration 
} from './templates';

export const calculateTotalDuration = (selectedTags) => {
  const tagArray = Array.from(selectedTags);
  const totalFrames = tagArray.reduce((total, tagInfo) => {
    const duration = parseInt(tagInfo.endFrame || '0', 10) - parseInt(tagInfo.startFrame || '0', 10);
    return total + duration;
  }, 0);
  return totalFrames * 2;
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
  const [includedClips, setIncludedClips] = useState([]);

  useEffect(() => {
    fetchFilm();
    fetchVideos();
  }, [id]);

  useEffect(() => {
    if (film?.data?.clips) {
      setIncludedClips(film.data.clips);
      setSelectedTags(new Set(film.data.clips));
    }
  }, [film]);

  useEffect(() => {
    if (film?.data?.template) {
      setSelectedTemplate(film.data.template);
    }
  }, [film]);

  const fetchFilm = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/films/${id}`);
      const data = await response.json();
      if (data.data && typeof data.data === 'string') {
        data.data = JSON.parse(data.data);
      }
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

  const saveClipsToFilm = async (newClips) => {
    try {
      const response = await fetch(`http://localhost:5000/api/films/${id}/data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          data: {
            ...film.data,
            clips: newClips
          }
        }),
      });
      
      if (response.ok) {
        setFilm({ 
          ...film, 
          data: {
            ...film.data,
            clips: newClips
          }
        });
      } else {
        console.error('Failed to update film clips');
      }
    } catch (error) {
      console.error('Error updating film clips:', error);
    }
  };

  const handleAddClip = (videoId, tagName, frame, videoName, videoFilepath, startFrame, endFrame) => {
    const newClip = {
      key: `${videoId}-${tagName}-${frame}-${startFrame}-${endFrame}`,
      videoId,
      videoName,
      videoFilepath,
      tagName,
      frame,
      startFrame,
      endFrame
    };
    
    const newClips = [...includedClips, newClip];
    setIncludedClips(newClips);
    setSelectedTags(new Set(newClips));
    saveClipsToFilm(newClips);
  };

  const handleRemoveClip = (clipKey) => {
    const newClips = includedClips.filter(clip => clip.key !== clipKey);
    setIncludedClips(newClips);
    setSelectedTags(new Set(newClips));
    saveClipsToFilm(newClips);
  };

  const saveTemplateToFilm = async (template) => {
    try {
      const response = await fetch(`http://localhost:5000/api/films/${id}/data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          data: {
            ...film.data,
            template: template
          }
        }),
      });
      
      if (response.ok) {
        setFilm({ 
          ...film, 
          data: {
            ...film.data,
            template: template
          }
        });
      } else {
        console.error('Failed to update film template');
      }
    } catch (error) {
      console.error('Error updating film template:', error);
    }
  };

  const handleTemplateChange = (e) => {
    const newTemplate = e.target.value;
    setSelectedTemplate(newTemplate);
    saveTemplateToFilm(newTemplate);
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

  const calculateDuration = () => {
    switch (selectedTemplate) {
      case 'VideoPreviewThenBackToBack':
        return calculatePreviewThenBackToBackDuration(selectedTags) || 1;
      case 'VideoFirstFiveSeconds':
        return calculateFirstFiveSecondsDuration(selectedTags) || 1;
      default:
        return calculatePreviewThenBackToBackDuration(selectedTags) || 1;
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
            onChange={handleTemplateChange}
          >
            <option value="VideoPreviewThenBackToBack">Preview Then Back-to-Back</option>
            <option value="VideoFirstFiveSeconds">First 5 Seconds of Each Clip</option>
          </select>
        </div>

        <div className="included-clips-container">
          <h2>Included Clips</h2>
          <table className="included-clips-table">
            <thead>
              <tr>
                <th>Video Name</th>
                <th>Tag Name</th>
                <th>Frame</th>
                <th>Frame Range</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {includedClips.map((clip) => (
                <tr key={clip.key}>
                  <td>{clip.videoName}</td>
                  <td>{clip.tagName}</td>
                  <td>{clip.frame}</td>
                  <td>{`${clip.startFrame}-${clip.endFrame}`}</td>
                  <td>
                    <button 
                      onClick={() => handleRemoveClip(clip.key)}
                      className="remove-clip-button"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="video-player">
          {selectedTags.size > 0 ? (
            <>
              <Player
                component={renderPlayerComponent()}
                inputProps={{
                  selectedVideos,
                  videos,
                  selectedTags
                }}
                durationInFrames={calculateDuration()}
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
                durationInFrames={calculateDuration()}
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
                <th>Actions</th>
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
                  video.tags
                    .filter(tag => tag.startFrame && tag.endFrame)
                    .map((tag, index) => {
                      const tagKey = `${video.id}-${tag.name}-${tag.frame}-${tag.startFrame}-${tag.endFrame}`;
                      const isIncluded = includedClips.some(clip => clip.key === tagKey);
                      
                      return (
                        <tr key={`${video.id}-${index}`}>
                          <td>
                            {!isIncluded && (
                              <button
                                onClick={() => handleAddClip(
                                  video.id,
                                  tag.name,
                                  tag.frame,
                                  video.name,
                                  video.filepath,
                                  tag.startFrame,
                                  tag.endFrame
                                )}
                                className="add-clip-button"
                              >
                                Add
                              </button>
                            )}
                          </td>
                          <td>{video.name}</td>
                          <td>{tag.name}</td>
                          <td>{tag.frame}</td>
                          <td>{`${tag.startFrame}-${tag.endFrame}`}</td>
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
