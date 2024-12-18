import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams } from 'react-router-dom';
import Layout from 'components/pages/Layout';
import { Player } from '@remotion/player';
import './ViewFilm.css';
import { RenderCommand } from 'components/RenderCommand';
import { 
  VideoFirstFiveSeconds,
  calculateFirstFiveSecondsDuration 
} from 'components/templates';
import { CloudRenderButton } from 'components/CloudRenderButton';
import { GlobalContext } from '../../index';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

export const calculateTotalDuration = (selectedTags) => {
  const tagArray = Array.from(selectedTags);
  const totalFrames = tagArray.reduce((total, tagInfo) => {
    const duration = parseInt(tagInfo.endFrame || '0', 10) - parseInt(tagInfo.startFrame || '0', 10);
    return total + duration;
  }, 0);
  return totalFrames * 2;
};

const calculateStartFrameForClip = (clips, currentIndex) => {
  return clips
    .slice(0, currentIndex)
    .reduce((total, clip) => {
      return total + (clip.endFrame - clip.startFrame);
    }, 0);
};

const getClipDurationClass = (duration, allDurations) => {
  if (!allDurations || allDurations.length === 0) return '';
  
  // Sort durations in descending order
  const sortedDurations = [...allDurations].sort((a, b) => b - a);
  
  // Calculate threshold indices
  const topTenIndex = Math.floor(sortedDurations.length * 0.1);
  const topQuarterIndex = Math.floor(sortedDurations.length * 0.25);
  
  // Get threshold values
  const topTenThreshold = sortedDurations[topTenIndex];
  const topQuarterThreshold = sortedDurations[topQuarterIndex];
  
  if (duration >= topTenThreshold) return 'very-long-clip';
  if (duration >= topQuarterThreshold) return 'long-clip';
  return '';
};

function ViewFilm() {
  const globalData = useContext(GlobalContext);
  const [film, setFilm] = useState(null);
  const [videos, setVideos] = useState([]);
  const { id } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [selectedVideos, setSelectedVideos] = useState(new Set());
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState('VideoFirstFiveSeconds');
  const [includedClips, setIncludedClips] = useState([]);
  const playerRef = useRef(null);
  const [renderStatus, setRenderStatus] = useState(null);
  const [renderFilename, setRenderFilename] = useState(null);
  const [isRenderHistoryCollapsed, setIsRenderHistoryCollapsed] = useState(true);
  const [tagFilter, setTagFilter] = useState('');
  const [isClipsExpanded, setIsClipsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewEndFrame, setPreviewEndFrame] = useState(null);
  const [previewPlaybackRate, setPreviewPlaybackRate] = useState(1);
  const [previewLoopCount, setPreviewLoopCount] = useState(0);
  const [previewStartFrame, setPreviewStartFrame] = useState(null);
  const [slowPreviewEndFrame, setSlowPreviewEndFrame] = useState(null);
  const [previewPending, setPreviewPending] = useState(false);
  const [currentPlayingClip, setCurrentPlayingClip] = useState(null);
  const [currentFrame, setCurrentFrame] = useState(0);

  const fetchFilm = async () => {
    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/films/${id}`);
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
      const response = await fetch(`${globalData.APIbaseUrl}/api/videos/with-tags`);
      const data = await response.json();
      setVideos(data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const handleSaveTitle = async () => {
    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/films/${id}/name`, {
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

  const handleVideoToggle = async (videoId) => {
    setSelectedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });

    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/films/${id}/data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          data: {
            ...film.data,
            selectedVideos: Array.from(selectedVideos).concat(videoId)
          }
        }),
      });
      
      if (response.ok) {
        setFilm({ 
          ...film, 
          data: {
            ...film.data,
            selectedVideos: Array.from(selectedVideos).concat(videoId)
          }
        });
      } else {
        console.error('Failed to update selected videos');
      }
    } catch (error) {
      console.error('Error updating selected videos:', error);
    }
  };

  const saveClipsToFilm = async (newClips) => {
    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/films/${id}/data`, {
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
    
    handleAddManyClips([newClip]);
  };

  const handleRemoveClip = (clipKey) => {
    const newClips = includedClips.filter(clip => clip.key !== clipKey);
    setIncludedClips(newClips);
    setSelectedTags(new Set(newClips));
    saveClipsToFilm(newClips);
  };

  const saveTemplateToFilm = async (template) => {
    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/films/${id}/data`, {
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

  const handleSeekToFrame = (frameNumber) => {
    if (playerRef.current) {
      playerRef.current.seekTo(frameNumber);
    }
  };

  const renderPlayerComponent = () => {
    switch (selectedTemplate) {
      case 'VideoFirstFiveSeconds':
        return VideoFirstFiveSeconds;
      default:
        return VideoFirstFiveSeconds;
    }
  };

  const calculateDuration = () => {
    switch (selectedTemplate) {
      case 'VideoFirstFiveSeconds':
        return calculateFirstFiveSecondsDuration(selectedTags) || 1;
      default:
        return calculateFirstFiveSecondsDuration(selectedTags) || 1;
    }
  };

  const checkRenderStatus = async (filename) => {
    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/check-render/${filename}`);
      const data = await response.json();
      
      if (data.status === 'completed') {
        setRenderStatus('completed');
        
        // Get existing renders or initialize empty array
        const existingRenders = film.data.renders || [];
        
        // Add new render to the list
        const newRender = {
          filename: data.filename,
          b2_url: data.b2_url,
          timestamp: data.timestamp,
          file_id: data.file_id,
          size: data.size,
          status: 'completed'
        };

        // Update film metadata with new render info
        await fetch(`${globalData.APIbaseUrl}/api/films/${id}/data`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              ...film.data,
              renders: [...existingRenders, newRender]
            }
          }),
        });

        // Update local film state
        setFilm(prevFilm => ({
          ...prevFilm,
          data: {
            ...prevFilm.data,
            renders: [...existingRenders, newRender]
          }
        }));

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking render status:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchFilm();
    fetchVideos();
  }, [id]);

  useEffect(() => {
    if (film?.data) {
      if (film.data.clips) {
        setIncludedClips(film.data.clips);
        setSelectedTags(new Set(film.data.clips));
      }
      if (film.data.selectedVideos) {
        setSelectedVideos(new Set(film.data.selectedVideos));
      }
      if (film.data.template) {
        setSelectedTemplate(film.data.template);
      }
    }
  }, [film]);

  const handleAddManyClips = async (newClipsArray) => {
    // Filter out any clips that are already included
    const uniqueNewClips = newClipsArray.filter(newClip => 
      !includedClips.some(clip => clip.key === newClip.key)
    );

    if (uniqueNewClips.length === 0) return;

    const updatedClips = [...includedClips, ...uniqueNewClips];

    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/films/${id}/data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          data: {
            ...film.data,
            clips: updatedClips
          }
        }),
      });
      
      if (response.ok) {
        setIncludedClips(updatedClips);
        setSelectedTags(new Set(updatedClips));
        setFilm({ 
          ...film, 
          data: {
            ...film.data,
            clips: updatedClips
          }
        });
      } else {
        console.error('Failed to update film clips');
      }
    } catch (error) {
      console.error('Error updating film clips:', error);
    }
  };

  const handleAddAllVisibleTags = () => {
    const clipsToAdd = videos
      .filter(video => selectedVideos.has(video.id))
      .flatMap((video) => 
        video.tags
          .filter(tag => tag.startFrame && tag.endFrame)
          .filter(tag => 
            tag.name.toLowerCase().includes(tagFilter.toLowerCase()) ||
            video.name.toLowerCase().includes(tagFilter.toLowerCase())
          )
          .map(tag => ({
            key: `${video.id}-${tag.name}-${tag.frame}-${tag.startFrame}-${tag.endFrame}`,
            videoId: video.id,
            videoName: video.name,
            videoFilepath: video.filepath,
            tagName: tag.name,
            frame: tag.frame,
            startFrame: tag.startFrame,
            endFrame: tag.endFrame
          }))
      );

    handleAddManyClips(clipsToAdd);
  };

  const handleAddAllClips = () => {
    const clipsToAdd = videos
      .filter(video => selectedVideos.has(video.id))
      .flatMap((video) => 
        video.tags
          .filter(tag => tag.startFrame && tag.endFrame)
          .map(tag => ({
            key: `${video.id}-${tag.name}-${tag.frame}-${tag.startFrame}-${tag.endFrame}`,
            videoId: video.id,
            videoName: video.name,
            videoFilepath: video.filepath,
            tagName: tag.name,
            frame: tag.frame,
            startFrame: tag.startFrame,
            endFrame: tag.endFrame
          }))
      );

    handleAddManyClips(clipsToAdd);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const newClips = Array.from(includedClips);
    const [reorderedItem] = newClips.splice(result.source.index, 1);
    newClips.splice(result.destination.index, 0, reorderedItem);

    setIncludedClips(newClips);
    saveClipsToFilm(newClips);
  };

  const refreshRenderHistory = async () => {
    setIsRefreshing(true);
    try {
      // Get all filenames from renders
      const filenames = film.data.renders.map(render => render.filename);
      
      const response = await fetch(`${globalData.APIbaseUrl}/api/check-b2-files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filenames })
      });
      
      const data = await response.json();
      
      if (data.results) {
        // Update film data with new render info
        const updatedRenders = film.data.renders.map(render => {
          const matchingResult = data.results.find(r => r.filename === render.filename);
          if (matchingResult) {
            return {
              ...render,
              ...matchingResult
            };
          }
          return render;
        });
        
        // Update film metadata
        await fetch(`${globalData.APIbaseUrl}/api/films/${id}/data`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              ...film.data,
              renders: updatedRenders
            }
          }),
        });
        
        // Update local state
        setFilm(prevFilm => ({
          ...prevFilm,
          data: {
            ...prevFilm.data,
            renders: updatedRenders
          }
        }));
      }
    } catch (error) {
      console.error('Error refreshing render history:', error);
    } finally {
      setIsRefreshing(false);
    }
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
        playerRef.current?.pause();
        setPreviewEndFrame(null);
        setPreviewPlaybackRate(1);
        setPreviewLoopCount(0);
        setPreviewStartFrame(null);
        setCurrentPlayingClip(null);
      }
    }
  };

  const handlePreviewClip = (clip) => {
    if (playerRef.current) {
      playerRef.current.seekTo(clip.startFrame);
      playerRef.current.pause();
      setPreviewPending(true);
      setPreviewStartFrame(clip.startFrame);
      setPreviewEndFrame(clip.endFrame);
      setCurrentPlayingClip(clip.key);
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
        
        <div className="template-selector">
          <label htmlFor="template-select">Select Video Template: </label>
          <select
            id="template-select"
            value={selectedTemplate}
            onChange={handleTemplateChange}
          >
            <option value="VideoFirstFiveSeconds">All clips back to back</option>
          </select>
        </div>

        <div className={`included-clips-container ${isClipsExpanded ? 'expanded' : ''}`}>
          <div className="included-clips-header">
            <h2>Included Clips</h2>
            <button 
              className="expand-toggle"
              onClick={() => setIsClipsExpanded(!isClipsExpanded)}
            >
              {isClipsExpanded ? '🗗 Minimize' : '⤢ Expand'}
            </button>
          </div>
          <DragDropContext onDragEnd={onDragEnd}>
            <table className="included-clips-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Video Name</th>
                  <th>Tag Name</th>
                  <th>Frame</th>
                  <th>Frame Range</th>
                  <th>Duration</th>
                  <th>Frame Range of Output</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <Droppable droppableId="clips">
                {(provided) => (
                  <tbody
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {(() => {
                      // Calculate all durations once
                      const allDurations = includedClips.map(clip => 
                        clip.endFrame - clip.startFrame
                      );
                      
                      return includedClips.map((clip, index) => {
                        const startFrame = calculateStartFrameForClip(includedClips, index);
                        const clipDuration = clip.endFrame - clip.startFrame;
                        const endFrame = startFrame + clipDuration;
                        const durationInSeconds = (clipDuration / 30).toFixed(1);
                        const durationClass = getClipDurationClass(clipDuration, allDurations);
                        
                        return (
                          <Draggable 
                            key={clip.key} 
                            draggableId={clip.key} 
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <tr
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`${snapshot.isDragging ? 'dragging' : ''} ${durationClass}`}
                              >
                                <td {...provided.dragHandleProps} className="drag-handle">
                                  ⋮⋮
                                </td>
                                <td>
                                  <a 
                                    href={`/videos/${clip.videoId}?startFrame=${clip.startFrame}&endFrame=${clip.endFrame}`} 
                                    className="video-link"
                                  >
                                    {clip.videoName} ({clip.startFrame}-{clip.endFrame})
                                  </a>
                                </td>
                                <td>{clip.tagName}</td>
                                <td>{clip.frame}</td>
                                <td>{`${clip.startFrame}-${clip.endFrame}`}</td>
                                <td className="duration-cell">
                                  <div className="duration-content">
                                    <span>{durationInSeconds}s</span>
                                    {currentPlayingClip === clip.key && (
                                      <div className="clip-progress">
                                        <div 
                                          className="progress-bar"
                                          style={{
                                            width: `${Math.round(((currentFrame - clip.startFrame) / (clip.endFrame - clip.startFrame)) * 100)}%`
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <span 
                                    className="clickable-frame-range"
                                    onClick={() => handleSeekToFrame(startFrame)}
                                  >
                                    {`${startFrame}-${endFrame}`}
                                  </span>
                                </td>
                                <td>
                                  <div className="clip-actions">
                                    <button 
                                      onClick={() => handlePreviewClip(clip)}
                                      className={`preview-clip-button ${currentPlayingClip === clip.key ? 'playing' : ''}`}
                                      title="Preview this clip"
                                    >
                                      {currentPlayingClip === clip.key ? '⏸️' : '▶️'}
                                    </button>
                                    <button 
                                      onClick={() => handleRemoveClip(clip.key)}
                                      className="remove-clip-button"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Draggable>
                        );
                      });
                    })()}
                    {provided.placeholder}
                  </tbody>
                )}
              </Droppable>
            </table>
          </DragDropContext>
        </div>

        <div className="video-player">
          {selectedTags.size > 0 ? (
            <>
              <Player
                ref={playerRef}
                component={renderPlayerComponent()}
                inputProps={{
                  selectedVideos,
                  videos,
                  selectedTags,
                  onFrameUpdate: handleFrameUpdate
                }}
                durationInFrames={calculateDuration()}
                compositionWidth={1280}
                compositionHeight={720}
                fps={30}
                controls
                loop={!previewEndFrame}
                playbackRate={previewPlaybackRate} 
                style={{
                  width: '100%',
                  aspectRatio: '16/9'
                }}
              />
              <CloudRenderButton 
                selectedVideos={selectedVideos}
                videos={videos}
                selectedTags={selectedTags}
                outputFileName={`${film.name.replace(/\s+/g, '_')}.mp4`}
                onRenderStart={(filename) => {
                  setRenderStatus('rendering');
                  setRenderFilename(filename);
                  
                  // Start polling
                  const pollInterval = setInterval(async () => {
                    const isComplete = await checkRenderStatus(filename);
                    if (isComplete) {
                      clearInterval(pollInterval);
                    }
                  }, 1000); // Poll every 5 seconds
                }}
                renderStatus={renderStatus}
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

        {film.data.renders && (
          <div className="render-history">
            <div className="render-history-header">
              <h3>Render History</h3>
              <button 
                onClick={refreshRenderHistory}
                disabled={isRefreshing}
                className="refresh-button"
              >
                {isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
              </button>
            </div>
            <table className="render-history-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Filename</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {film.data.renders
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .map((render, index) => (
                    <tr key={index}>
                      <td>{new Date(render.timestamp).toLocaleString()}</td>
                      <td>{render.filename}</td>
                      <td>{render.size ? `${(render.size / 1024 / 1024).toFixed(2)} MB` : '-'}</td>
                      <td>
                        <span className={`status-${render.status.toLowerCase()}`}>
                          {render.status}
                        </span>
                      </td>
                      <td>
                        {render.b2_url && (
                          <a 
                            href={render.b2_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="download-link"
                          >
                            Download
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="video-table-container">
          <h2>Videos</h2>
          <table className="film-table">
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
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Filter tags..."
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              style={{ padding: '0.5rem', flexGrow: 1 }}
            />
            <button 
              onClick={handleAddAllVisibleTags}
              className="add-clip-button"
              style={{ padding: '0.5rem 1rem' }}
            >
              Add Filtered Tags
            </button>
            <button 
              onClick={handleAddAllClips}
              className="add-clip-button"
              style={{ padding: '0.5rem 1rem' }}
            >
              Add All Tags
            </button>
          </div>
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
                    .filter(tag => 
                      tag.name.toLowerCase().includes(tagFilter.toLowerCase()) ||
                      video.name.toLowerCase().includes(tagFilter.toLowerCase())
                    )
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
