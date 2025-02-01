import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams } from 'react-router-dom';
import Layout from 'components/pages/Layout';
import { Player } from '@remotion/player';
import './ViewFilm.css';
import { RenderCommand } from 'components/RenderCommand';
import { 
  VideoFirstFiveSeconds,
  calculateFirstFiveSecondsDuration,
  VideoPlayerTrackingTemplate,
  calculatePlayerTrackingDuration,
  VideoPlayerTrackingSettings
} from 'components/templates';
import { CloudRenderButton } from 'components/CloudRenderButton';
import { GlobalContext } from '../../index';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { RenderHistory } from 'components/RenderHistory';
import { TagsTable } from 'components/TagsTable';
import { ClipSettings } from 'components/ClipSettings';
import { filmService } from 'services/filmService';

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

const getPlayersInFrameRange = (metadata, startFrame, endFrame) => {
  if (!metadata?.boxes) return new Set();
  
  const players = new Set();
  metadata.boxes.forEach(box => {
    if (!box) return;
    Object.entries(box).forEach(([player, data]) => {
      const frame = data.frame;
      if (frame >= startFrame && frame <= endFrame) {
        players.add(player);
      }
    });
  });
  return players;
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
  const [currentPlayingClipRef, setCurrentPlayingClipRef] = useState(null);
  const [clipSettings, setClipSettings] = useState({});

  const fetchFilm = async () => {
    try {
      const data = await filmService.fetchFilm(globalData.APIbaseUrl, id);
      setFilm(data);
    } catch (error) {
      console.error('Error fetching film:', error);
    }
  };

  const fetchVideos = async () => {
    try {
      const data = await filmService.fetchVideos(globalData.APIbaseUrl);
      setVideos(data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const handleSaveTitle = async () => {
    try {
      const success = await filmService.updateFilmName(globalData.APIbaseUrl, id, editedName);
      if (success) {
        setFilm({ ...film, name: editedName });
        setIsEditing(false);
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
      const updatedFilm = await filmService.saveClips(globalData.APIbaseUrl, id, film, newClips);
      if (updatedFilm) {
        setFilm(updatedFilm);
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

  const handleTemplateChange = async (e) => {
    const newTemplate = e.target.value;
    try {
      const updatedFilm = await filmService.saveTemplate(globalData.APIbaseUrl, id, film, newTemplate);
      if (updatedFilm) {
        setFilm(updatedFilm);
        setSelectedTemplate(newTemplate);
      }
    } catch (error) {
      console.error('Error updating template:', error);
    }
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
      case 'VideoPlayerTracking':
        return VideoPlayerTrackingTemplate;
      default:
        return VideoFirstFiveSeconds;
    }
  };

  const calculateDuration = () => {
    switch (selectedTemplate) {
      case 'VideoFirstFiveSeconds':
        return calculateFirstFiveSecondsDuration(selectedTags) || 1;
      case 'VideoPlayerTracking':
        return calculatePlayerTrackingDuration(selectedTags) || 1;
      default:
        return calculateFirstFiveSecondsDuration(selectedTags) || 1;
    }
  };

  const checkRenderStatus = async (filename) => {
    try {
      const isComplete = await filmService.checkRenderStatus(
        globalData.APIbaseUrl, 
        filename,
        film,
        ({ status, film: updatedFilm }) => {
          setRenderStatus(status);
          setFilm(updatedFilm);
        }
      );
      return isComplete;
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
      const filenames = film.data.renders.map(render => render.filename);
      const data = await filmService.refreshB2Files(globalData.APIbaseUrl, filenames);
      
      if (data.results) {
        const updatedRenders = film.data.renders.map(render => {
          const matchingResult = data.results.find(r => r.filename === render.filename);
          return matchingResult ? { ...render, ...matchingResult } : render;
        });
        
        await filmService.updateFilmData(globalData.APIbaseUrl, id, {
          ...film.data,
          renders: updatedRenders
        });
        
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
    
    // Calculate which clip we're currently playing
    let accumulatedFrames = 0;
    const currentClip = includedClips.find((clip, index) => {
      const clipDuration = clip.endFrame - clip.startFrame;
      if (frame >= accumulatedFrames && frame < accumulatedFrames + clipDuration) {
        return true;
      }
      accumulatedFrames += clipDuration;
      return false;
    });

    // Update currentPlayingClipRef if we found a clip and it's different from current
    if (currentClip) {
      setCurrentPlayingClipRef(prev => {
        if (!prev || prev.key !== currentClip.key) {
          return currentClip;
        }
        return prev;
      });
      setCurrentPlayingClip(currentClip.key);
    }
    
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
        setCurrentPlayingClipRef(null);
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
      setCurrentPlayingClipRef(clip);
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

  const handleSettingChange = (clipKey, setting, value) => {
    setClipSettings(prev => ({
      ...prev,
      [clipKey]: {
        ...(prev[clipKey] || {}),
        [setting]: value
      }
    }));
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
        
        <div className="template-selector">
          <label htmlFor="template-select">Select Video Template: </label>
          <select
            id="template-select"
            value={selectedTemplate}
            onChange={handleTemplateChange}
          >
            <option value="VideoFirstFiveSeconds">All clips back to back</option>
            <option value="VideoPlayerTracking">Player Tracking</option>
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
                        
                        // Calculate if this clip is currently playing and its current frame
                        const isCurrentClip = currentFrame >= startFrame && currentFrame < endFrame;
                        const currentClipFrame = isCurrentClip 
                          ? clip.startFrame + (currentFrame - startFrame)
                          : null;
                        
                        return (
                          <>
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
                                  <td>
                                    {isCurrentClip ? (
                                      <span style={{ 
                                        color: '#0d6efd',
                                        fontWeight: 'bold'
                                      }}>
                                        {currentClipFrame} / abs: {currentFrame}
                                      </span>
                                    ) : (
                                      clip.frame
                                    )}
                                  </td>
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
                            <ClipSettings
                              clip={clip}
                              videos={videos}
                              clipSettings={clipSettings}
                              onSettingChange={handleSettingChange}
                            />
                          </>
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
                  onFrameUpdate: handleFrameUpdate,
                  width: 1280,
                  height: 720,
                  settings: clipSettings
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
                compositionName={selectedTemplate}
                settings={clipSettings}
                onRenderStart={(filename) => {
                  setRenderStatus('rendering');
                  setRenderFilename(filename);
                  
                  // Start polling
                  const pollInterval = setInterval(async () => {
                    const isComplete = await checkRenderStatus(filename);
                    if (isComplete) {
                      clearInterval(pollInterval);
                    }
                  }, 1000);
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
          <RenderHistory 
            renders={film.data.renders}
            onRefresh={refreshRenderHistory}
            isRefreshing={isRefreshing}
          />
        )}

        <TagsTable 
          videos={videos}
          selectedVideos={selectedVideos}
          tagFilter={tagFilter}
          setTagFilter={setTagFilter}
          onAddClip={handleAddClip}
          onAddAllVisibleTags={handleAddAllVisibleTags}
          onAddAllClips={handleAddAllClips}
          includedClips={includedClips}
        />
      </div>
    </Layout>
  );
}

export default ViewFilm;
