import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import Layout from './Layout';
import axios from 'axios';
import { Player } from '@remotion/player';
import { getVideoMetadata } from '@remotion/media-utils';
import VideoPlayer from '../VideoPlayer';
import { JSONTree } from 'react-json-tree';
import './VideoDetail.css';
import { useHotkeys } from '../Hotkeys';
import { useTagAdder } from '../hotkeys/TagAdder';
import { useVideoSeeker } from '../hotkeys/VideoSeeker';
import { useHighlightAdder } from '../hotkeys/HighlightAdder';
import { useSpeedController } from '../hotkeys/SpeedController';
import { usePlayPauseController } from '../hotkeys/PlayPauseController';
import { useRangeBuilder } from '../hotkeys/RangeBuilder';
import { useListen } from '../hotkeys/Listen';
import { debounce } from 'lodash';
import { FaPencilAlt, FaSave } from 'react-icons/fa';
import { GlobalContext } from '../../index'; 
import Draggable from 'react-draggable';
import { Stage, Layer, Line, Circle } from 'react-konva';
import { RangesSection } from '../RangesSection';
import { DictationDisplay } from '../DictationDisplay';

function VideoDetail() {
  const globalData = useContext(GlobalContext);
  const { id } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialFrame = parseInt(searchParams.get('startFrame')) || 0;
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [metadata, setMetadata] = useState('');
  const [saveButtonText, setSaveButtonText] = useState('Save Metadata');
  const playerRef = useRef(null);
  const [parsedMetadata, setParsedMetadata] = useState({});
  const [jsonError, setJsonError] = useState(null);
  const [hotkeyMode, setHotkeyMode] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [durationInFrames, setDurationInFrames] = useState(30 * 60); // Default fallback
  const [videoMetadata, setVideoMetadata] = useState(null);
  const [hotkeysExpanded, setHotkeysExpanded] = useState(false);
  const [metadataExpanded, setMetadataExpanded] = useState(false);
  const [videoInfoExpanded, setVideoInfoExpanded] = useState(false);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [activeHotkeySet, setActiveHotkeySet] = useState('set1');
  const [hotkeyGroups, setHotkeyGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [hotkeyButtonsExpanded, setHotkeyButtonsExpanded] = useState(false);
  const [buttonOrder, setButtonOrder] = useState([]);
  const [dragMode, setDragMode] = useState(false);
  const [buttonPositions, setButtonPositions] = useState({});
  const [shapesExpanded, setShapesExpanded] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [shapes, setShapes] = useState([]);
  const stageRef = useRef(null);
  const [shapesData, setShapesData] = useState([]);
  const [shapesSaveStatus, setShapesSaveStatus] = useState('');
  const [boxesData, setBoxesData] = useState(null);
  const [boxesLoading, setBoxesLoading] = useState(false);
  const [activeIncrementButtons, setActiveIncrementButtons] = useState(new Set());
  const [rangesExpanded, setRangesExpanded] = useState(false);
  const { markFrame, breakRange, ranges, enforceRangeById } = useRangeBuilder({ playerRef }, currentFrame);
  var { 
    isListening, 
    transcript, 
    analysis, 
    isProcessing, 
    startListening, 
    stopListening, 
    processTranscript,
    setDictationCurrentFrame,
    setNotes
  } = useListen(GlobalContext);
  const [activeGroupInstructions, setActiveGroupInstructions] = useState([]);

  useEffect(() => {
    const fetchVideoDetails = async () => {
      try {
        const response = await axios.get(`${globalData.APIbaseUrl}/api/videos/${id}`);
        setVideo(response.data);
        setMetadata(JSON.stringify(response.data.metadata, null, 2));
        setParsedMetadata(response.data.metadata);
        
        // Load saved shapes if they exist
        if (response.data.metadata?.shapes) {
          setShapesData(response.data.metadata.shapes);
          setShapes(response.data.metadata.shapes.map(shape => shape.points));
        }
        
        // Get video metadata using Remotion
        const videoUrl = response.data.filepath;
        const metadata = await getVideoMetadata(videoUrl);
        const assumedFps = 30;
        metadata.fps = assumedFps;
        setVideoMetadata(metadata);
        
        // Calculate duration in frames based on actual video duration and fps
        const frames = Math.ceil(metadata.durationInSeconds * metadata.fps);
        setDurationInFrames(frames);
        
        // Seek to initial frame after video loads
        if (initialFrame && playerRef.current) {
          playerRef.current.seekTo(initialFrame);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching video details:', error);
        setLoading(false);
      }
    };

    fetchVideoDetails();
  }, [id, initialFrame]);

  useEffect(() => {
    const fetchHotkeys = async () => {
      try {
        const response = await axios.get(`${globalData.APIbaseUrl}/api/hotkeys/`);
        setHotkeyGroups(response.data);
        if (response.data.length > 0) {
          const firstGroup = response.data[0];
          setActiveGroupId(firstGroup.id);
          setActiveGroupInstructions(firstGroup.instructions || []);
        }
      } catch (error) {
        console.error('Error fetching hotkeys:', error);
      }
    };

    fetchHotkeys();
  }, []);

  useEffect(() => {
    if (hotkeyGroups.length > 0 && activeGroupId) {
      const currentGroup = hotkeyGroups.find(g => g.id === activeGroupId);
      setActiveGroupInstructions(currentGroup?.instructions || []);
    }
  }, [activeGroupId, hotkeyGroups]);

  useEffect(() => {
    if (hotkeyGroups.length > 0 && activeGroupId) {
      const currentGroup = hotkeyGroups.find(g => g.id === activeGroupId);
      if (currentGroup?.shortcuts) {
        setButtonOrder(Object.keys(currentGroup.shortcuts));
      }
    }
  }, [hotkeyGroups, activeGroupId]);

  useEffect(() => {
    if (activeGroupId) {
      const savedPositions = localStorage.getItem(`hotkey-positions-${activeGroupId}`);
      if (savedPositions) {
        setButtonPositions(JSON.parse(savedPositions));
      }
    }
  }, [activeGroupId]);

  const handleFrameUpdate = useCallback((frame) => {
    setCurrentFrame(frame);
    console.log('setting dictation current frame to', frame);
    setDictationCurrentFrame(frame);
  }, []);

  const handleMetadataChange = (e) => {
    setMetadata(e.target.value);
    try {
      setParsedMetadata(JSON.parse(e.target.value));
      setJsonError(null);
    } catch (error) {
      console.error('Invalid JSON:', error);
      setJsonError('Invalid JSON: ' + error.message);
    }
  };

  const handleSaveMetadata = async () => {
    if (jsonError) {
      alert('Cannot save invalid JSON. Please fix the errors and try again.');
      return;
    }

    setSaveButtonText('Saving...');
    try {
      await axios.post(`${globalData.APIbaseUrl}/api/videos/${id}/metadata`, { metadata });
      setSaveButtonText('Saved ✅');
      setTimeout(() => {
        setSaveButtonText('Save Metadata');
      }, 2000);
    } catch (error) {
      console.error('Error saving metadata:', error);
      setSaveButtonText('Error Saving');
      setTimeout(() => {
        setSaveButtonText('Save Metadata');
      }, 2000);
    }
  };

  const toggleHotkeyMode = () => {
    setHotkeyMode(!hotkeyMode);
  };

  const updateMetadata = useCallback((updater) => {
    setMetadata(prevMetadata => {
      const newMetadata = updater(JSON.parse(prevMetadata));
      setParsedMetadata(prevParsedMetadata => {
        const newParsedMetadata = newMetadata;
        return newParsedMetadata;
      });
      return JSON.stringify(newMetadata, null, 2);
    });
  }, [setMetadata, setParsedMetadata]);

  const playbackRateRef = useRef(playbackRate);
  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);
  const getPlaybackRate = useCallback(() => playbackRateRef.current, []);

  const addTag = useTagAdder({ updateMetadata, playerRef }, currentFrame);
  const { seekBackward, seekForward } = useVideoSeeker({ playerRef }, currentFrame);
  const addHighlight = useHighlightAdder({ updateMetadata, playerRef }, currentFrame);
  const { slowDown, speedUp, resetSpeed } = useSpeedController({ getPlaybackRate, setPlaybackRate });
  const { togglePlayPause } = usePlayPauseController({ playerRef });

  const getCurrentHotkeys = useCallback(() => {
    if (!hotkeyGroups.length || activeGroupId === null) return {};
    
    const currentGroup = hotkeyGroups.find(group => group.id === activeGroupId);
    if (!currentGroup || !currentGroup.shortcuts) return {};

    const hotkeys = {};
    Object.entries(currentGroup.shortcuts).forEach(([key, shortcut]) => {
      hotkeys[key] = () => {
        try {
          // Evaluate the action string in the context of available functions
          eval(shortcut.action);
        } catch (error) {
          console.error('Error executing hotkey action:', error);
        }
      };
    });
    
    return hotkeys;
  }, [hotkeyGroups, activeGroupId]);

  const { registerHotkey, setHotkeys } = useHotkeys(
    hotkeyMode,
    { 
      updateMetadata, 
      playerRef,
      getPlaybackRate,
      setPlaybackRate
    },
    currentFrame,
    getCurrentHotkeys()
  );

  useEffect(() => {
    setHotkeys(getCurrentHotkeys());
  }, [activeGroupId, setHotkeys, getCurrentHotkeys]);

  const renderHotkeyGroupSelector = () => (
    <select 
      value={activeGroupId || ''} 
      onChange={(e) => setActiveGroupId(Number(e.target.value))}
      className="hotkey-set-selector"
    >
      {hotkeyGroups.map(group => (
        <option key={group.id} value={group.id}>{group.name}</option>
      ))}
    </select>
  );

  const renderHotkeyInstructions = () => {
    if (!hotkeyGroups.length || activeGroupId === null) return null;
    
    const currentGroup = hotkeyGroups.find(group => group.id === activeGroupId);
    if (!currentGroup || !currentGroup.shortcuts) return null;

    return (
      <ul>
        {currentGroup.shortcuts.shortcuts ? (
          <>
            <h2>Shortcuts</h2>
            {Object.entries(currentGroup.shortcuts.shortcuts).map(([key, shortcut]) => (
              <li key={key}>'{key}': {shortcut.description}</li>
            ))}
            <br/>
            <h2>Instructions</h2>
            {Object.entries(currentGroup.shortcuts.instructions).map(([key, instruction]) => (
              <li key={key}>'{key}': {instruction}</li>
            ))}
          </>
        ) : (
          Object.entries(currentGroup.shortcuts).map(([key, shortcut]) => (
            <li key={key}>'{key}': {shortcut.description}</li>
          ))
        )}
      </ul>
    );
  };

  const theme = {
    scheme: 'monokai',
    author: 'wimer hazenberg (http://www.monokai.nl)',
    base00: '#272822',
    base01: '#383830',
    base02: '#49483e',
    base03: '#75715e',
    base04: '#a59f85',
    base05: '#f8f8f2',
    base06: '#f5f4f1',
    base07: '#f9f8f5',
    base08: '#f92672',
    base09: '#fd971f',
    base0A: '#f4bf75',
    base0B: '#a6e22e',
    base0C: '#a1efe4',
    base0D: '#66d9ef',
    base0E: '#ae81ff',
    base0F: '#cc6633'
  };

  const getSortedTags = () => {
    if (!parsedMetadata || !parsedMetadata.tags) return [];
    
    return [...parsedMetadata.tags].sort((a, b) => {
      const aFrame = a.startFrame || a.frame || 0;
      const bFrame = b.startFrame || b.frame || 0;
      return bFrame - aFrame;
    });
  };

  const handleTagFrameClick = (frame) => {
    if (playerRef.current) {
      playerRef.current.seekTo(frame);
    }
  };

  const handleTitleSave = async () => {
    try {
      await axios.put(`${globalData.APIbaseUrl}/api/videos/${id}/title`, {
        title: editedTitle
      });
      setVideo(prev => ({ ...prev, title: editedTitle }));
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Error updating title:', error);
      alert('Failed to update title');
    }
  };

  const handleDeleteTag = (frameNumber, tagName) => {
    updateMetadata(prevMetadata => {
      const newMetadata = { ...prevMetadata };
      newMetadata.tags = newMetadata.tags.filter(tag => {
        const tagFrame = tag.startFrame || tag.frame || 0;
        return !(tagFrame === frameNumber && tag.name === tagName);
      });
      return newMetadata;
    });
    // Trigger save
    handleSaveMetadata();
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(buttonOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setButtonOrder(items);
  };

  const handleDragStop = (key, e, data) => {
    const newPositions = {
      ...buttonPositions,
      [key]: { x: data.x, y: data.y }
    };
    setButtonPositions(newPositions);
    localStorage.setItem(`hotkey-positions-${activeGroupId}`, JSON.stringify(newPositions));
  };

  const calculatePolygonArea = (points) => {
    let area = 0;
    const numPoints = points.length / 2;
    
    for (let i = 0; i < numPoints; i++) {
      const j = (i + 1) % numPoints;
      area += points[i * 2] * points[j * 2 + 1];
      area -= points[j * 2] * points[i * 2 + 1];
    }
    
    return Math.abs(area / 2).toFixed(2);
  };

  const handleDeleteShape = (shapeId) => {
    setShapesData(shapesData.filter(shape => shape.id !== shapeId));
    setShapes(shapes.filter((_, index) => shapesData[index].id !== shapeId));
  };

  const handleShapeNameChange = (shapeId, newName) => {
    setShapesData(shapesData.map(shape => 
      shape.id === shapeId ? { ...shape, name: newName } : shape
    ));
  };

  const handleSaveShapes = async () => {
    setShapesSaveStatus('Saving...');
    try {
      const newMetadata = JSON.parse(metadata);
      newMetadata.shapes = shapesData;
      
      const metadataString = JSON.stringify(newMetadata, null, 2);
      setMetadata(metadataString);
      setParsedMetadata(newMetadata);
      
      await axios.post(`${globalData.APIbaseUrl}/api/videos/${id}/metadata`, { 
        metadata: metadataString 
      });
      
      setShapesSaveStatus('Saved ✅');
      setTimeout(() => setShapesSaveStatus(''), 2000);
    } catch (error) {
      console.error('Error saving shapes:', error);
      setShapesSaveStatus('Error ❌');
      setTimeout(() => setShapesSaveStatus(''), 2000);
    }
  };

  const handleShapeColorChange = (shapeId, newColor) => {
    setShapesData(shapesData.map(shape => 
      shape.id === shapeId ? { ...shape, color: newColor } : shape
    ));
  };

  const handleShapeVisibilityToggle = (shapeId) => {
    setShapesData(shapesData.map(shape => 
      shape.id === shapeId ? { ...shape, visible: !shape.visible } : shape
    ));
  };

  const handleFetchBoxes = async () => {
    setBoxesLoading(true);
    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/videos/get-boxes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_url: video.filepath,
        })
      });
      

      const data = await response.json();
      console.log('data', data);
      setBoxesData(data.boxes);
      
      
      // Update the metadata display without saving
      const newMetadata = JSON.parse(metadata);
      newMetadata.boxes = data.boxes;
      setMetadata(JSON.stringify(newMetadata, null, 2));
      setParsedMetadata(newMetadata);
      
    } catch (error) {
      console.error('Error fetching boxes:', error);
      alert('Failed to fetch boxes data');
    } finally {
      setBoxesLoading(false);
    }
  };

  useEffect(() => {
    setCurrentFrame(currentFrame);
  }, [currentFrame, setCurrentFrame]);

  if (loading) {
    return <Layout><div>Loading...</div></Layout>;
  }

  if (!video) {
    return <Layout><div>Video not found</div></Layout>;
  }

  const desiredWidth = 800;

  return (
    <Layout>
      <div className="video-detail-container">
        <div className="video-title">
          {isEditingTitle ? (
            <div className="title-edit-container">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="title-edit-input"
              />
              <FaSave 
                className="title-save-icon"
                onClick={handleTitleSave}
              />
            </div>
          ) : (
            <h1>
              {video.title}
              <FaPencilAlt 
                className="title-edit-icon"
                onClick={() => {
                  setEditedTitle(video.title);
                  setIsEditingTitle(true);
                }}
              />
            </h1>
          )}
          <Link 
            to={`/clipmaker?videoId=${video.id}`}
            className="clipmaker-link"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              padding: '8px 16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px'
            }}
          >
            Open in ClipMaker
          </Link>
        </div>

        {video.filepath.includes('backblaze') ? (
          <div className="video-player" style={{ position: 'relative' }}>
            <Player
              ref={playerRef}
              component={VideoPlayer}
              inputProps={{
                src: video.filepath,
                onFrameUpdate: handleFrameUpdate
              }}
              durationInFrames={durationInFrames}
              compositionWidth={desiredWidth}
              compositionHeight={Math.round(desiredWidth * (videoMetadata?.height / videoMetadata?.width))}
              playbackRate={playbackRate}
              fps={videoMetadata?.fps || 30}
              controls
              renderLoading={() => <div>Loading...</div>}
            />
            
            {shapesExpanded && (
              <Stage
                ref={stageRef}
                width={desiredWidth}
                height={Math.round(desiredWidth * (videoMetadata?.height / videoMetadata?.width))}
                onClick={(e) => {
                  if (!isDrawing) return;
                  
                  const stage = e.target.getStage();
                  const point = stage.getPointerPosition();
                  setCurrentPoints([...currentPoints, point.x, point.y]);
                  
                  // If clicking near start point, complete the polygon
                  if (currentPoints.length >= 4) {
                    const [startX, startY] = currentPoints;
                    const dist = Math.hypot(point.x - startX, point.y - startY);
                    if (dist < 20) {
                      const newShape = {
                        id: Date.now(),
                        points: [...currentPoints],
                        frame: currentFrame,
                        area: calculatePolygonArea(currentPoints),
                        name: `Shape ${shapesData.length + 1}`,
                        color: '#ff0000', // Default red
                        visible: true
                      };
                      setShapes([...shapes, [...currentPoints]]);
                      setShapesData([...shapesData, newShape]);
                      setCurrentPoints([]);
                      setIsDrawing(false);
                    }
                  }
                }}
                style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0,
                  pointerEvents: isDrawing ? 'auto' : 'none'
                }}
              >
                <Layer>
                  {/* Draw completed shapes */}
                  {shapes.map((points, i) => {
                    const shapeData = shapesData[i];
                    if (!shapeData?.visible) return null;
                    
                    return (
                      <Line
                        key={i}
                        points={points}
                        closed
                        fill={`${shapeData.color}4D`} // 30% opacity
                        stroke={shapeData.color}
                        strokeWidth={2}
                      />
                    );
                  })}
                  
                  {/* Draw current shape being created */}
                  {currentPoints.length > 0 && (
                    <>
                      <Line
                        points={currentPoints}
                        stroke="red"
                        strokeWidth={2}
                      />
                      {/* Draw points */}
                      {Array.from({ length: currentPoints.length / 2 }, (_, i) => (
                        <Circle
                          key={i}
                          x={currentPoints[i * 2]}
                          y={currentPoints[i * 2 + 1]}
                          radius={4}
                          fill="red"
                        />
                      ))}
                    </>
                  )}
                </Layer>
              </Stage>
            )}
          </div>
        ) : (
          <div className="video-unavailable-message">
            <p>This video is not hosted on Backblaze and cannot be played.</p>
          </div>
        )}

        <div className="hotkey-buttons">
          <div className="hotkey-buttons-header">
            <h3 onClick={() => setHotkeyButtonsExpanded(!hotkeyButtonsExpanded)}>
              Hotkey Buttons {hotkeyButtonsExpanded ? '▼' : '▶'}
            </h3>
            {hotkeyButtonsExpanded && (
              <button 
                onClick={() => setDragMode(!dragMode)}
                className={`drag-toggle ${dragMode ? 'active' : ''}`}
              >
                {dragMode ? '🔒 Lock' : '✋ Drag'}
              </button>
            )}
          </div>
          {hotkeyButtonsExpanded && (
            <div className="hotkey-buttons-container">
              {buttonOrder.map((key) => {
                const shortcut = hotkeyGroups.find(g => g.id === activeGroupId)?.shortcuts[key];
                if (!shortcut) return null;
                
                // Check if this is an increment button and get the key word
                const isIncrementButton = shortcut.description.startsWith('+');
                const incrementKey = isIncrementButton ? 
                  shortcut.description.slice(1).match(/^\S+/)?.[0] : null;
                const isActive = isIncrementButton && activeIncrementButtons.has(incrementKey);
                
                return (
                  <Draggable 
                    key={key}
                    defaultPosition={buttonPositions[key] || {x: 0, y: 0}}
                    position={buttonPositions[key] || null}
                    bounds="parent"
                    disabled={!dragMode}
                    onStop={(e, data) => handleDragStop(key, e, data)}
                  >
                    <button
                      onClick={() => {
                        if (!dragMode) {
                          try {
                            eval(shortcut.action);
                            
                            // Handle increment/decrement button states
                            if (isIncrementButton && incrementKey) {
                              setActiveIncrementButtons(prev => {
                                const next = new Set(prev);
                                next.add(incrementKey);
                                return next;
                              });
                            } else if (shortcut.description.startsWith('-')) {
                              const decrementKey = shortcut.description.slice(1).match(/^\S+/)?.[0];
                              if (decrementKey) {
                                setActiveIncrementButtons(prev => {
                                  const next = new Set(prev);
                                  next.delete(decrementKey);
                                  return next;
                                });
                              }
                            }
                          } catch (error) {
                            console.error('Error executing hotkey action:', error);
                          }
                        }
                      }}
                      className={`hotkey-action-button ${dragMode ? 'draggable' : ''} ${isActive ? 'active-increment' : ''}`}
                    >
                      {shortcut.description} ({key})
                    </button>
                  </Draggable>
                );
              })}
            </div>
          )}
        </div>

        <div className="hotkey-controls">
          <button onClick={toggleHotkeyMode}>
            {hotkeyMode ? 'Disable Hotkey Mode' : 'Enable Hotkey Mode'}
          </button>
          {renderHotkeyGroupSelector()}
        </div>

        <div className={`hotkey-indicator ${hotkeyMode ? 'active' : ''}`}>
          Hotkeys: {hotkeyMode ? 'ENABLED' : 'DISABLED'} | 
          Group: {hotkeyGroups.find(g => g.id === activeGroupId)?.name || 'None'}
        </div>

        <div className="metadata-container" style={{ border: 'none' }}>
          <button 
            onClick={handleSaveMetadata} 
            disabled={!!jsonError}
            className="action-button"
          >
            {saveButtonText}
          </button>
        </div>

        <div className="hotkey-instructions">
          <div className="hotkey-header" onClick={() => setHotkeysExpanded(!hotkeysExpanded)}>
            <h3>Hotkeys {hotkeysExpanded ? '▼' : '▶'}</h3>
          </div>
          {hotkeysExpanded && (
            <>
              <h4>Current Group: {hotkeyGroups.find(g => g.id === activeGroupId)?.name}</h4>
              {renderHotkeyInstructions()}
            </>
          )}
        </div>

        <div className="video-info">
          <div className="video-info-header" onClick={() => setVideoInfoExpanded(!videoInfoExpanded)}>
            <h3>Video Info {videoInfoExpanded ? '▼' : '▶'}</h3>
          </div>
          {videoInfoExpanded && (
            <div className="video-info-content">
              <p><strong>ID:</strong> {video.id}</p>
              <p><strong>Size:</strong> {(video.size / 1024 / 1024).toFixed(2)} MB</p>
              <p><strong>Filepath:</strong> {video.filepath}</p>
              <p><strong>Duration:</strong> {videoMetadata?.durationInSeconds.toFixed(2)}s ({durationInFrames} frames)</p>
              <p><strong>Resolution:</strong> {videoMetadata?.width}x{videoMetadata?.height}</p>
              <p><strong>FPS:</strong> {videoMetadata?.fps}</p>
              <p><strong>Current Frame:</strong> {currentFrame}</p>
              <p><strong>Playback Speed:</strong> {playbackRate}x</p>  
            </div>
          )}
        </div>

        <div className="tags-container">
          <div className="tags-header" onClick={() => setTagsExpanded(!tagsExpanded)}>
            <h3>Tags {tagsExpanded ? '▼' : '▶'}</h3>
          </div>
          {tagsExpanded && (
            <div className="tags-content">
              <table className="tags-table">
                <thead>
                  <tr>
                    <th>Frame</th>
                    <th>Name</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedTags().map((tag, index) => (
                    <tr key={index}>
                      <td 
                        onClick={() => handleTagFrameClick(tag.startFrame || tag.frame)}
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {tag.startFrame || tag.frame || 'N/A'}
                      </td>
                      <td>{tag.name || ''}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteTag(
                            tag.startFrame || tag.frame || 0,
                            tag.name
                          )}
                          className="delete-tag-button"
                          title="Delete tag"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="metadata-container">
          <div className="metadata-header" onClick={() => setMetadataExpanded(!metadataExpanded)}>
            <h3>Metadata {metadataExpanded ? '▼' : '▶'}</h3>
          </div>
          {metadataExpanded && (
            <>
              {jsonError && <div className="json-error">{jsonError}</div>}
              <div style={{ background: '#272822', padding: '10px', borderRadius: '5px' }}>
                <JSONTree
                  data={parsedMetadata}
                  theme={theme}
                  invertTheme={false}
                  shouldExpandNode={() => true}
                />
              </div>
              <textarea
                value={metadata}
                onChange={handleMetadataChange}
                rows={10}
                cols={50}
              />
              <button onClick={handleSaveMetadata} disabled={!!jsonError}>{saveButtonText}</button>

              <button 
                onClick={handleFetchBoxes}
                disabled={boxesLoading}
                className="action-button"
                style={{ marginTop: '10px' }}
              >
                {boxesLoading ? 'Loading Boxes...' : 'Load Boxes Data'}
              </button>
              {boxesData && (
                <p><strong>Boxes Data:</strong> Loaded for frame {currentFrame}</p>
              )}
            </>
          )}
        </div> 

        <div className="shapes-container">
          <div className="shapes-header" onClick={() => setShapesExpanded(!shapesExpanded)}>
            <h3>Shapes {shapesExpanded ? '▼' : '▶'}</h3>
          </div>
          {shapesExpanded && (
            <div className="shapes-content">
              <div className="shapes-controls">
                <button 
                  onClick={() => {
                    setIsDrawing(!isDrawing);
                    setCurrentPoints([]);
                  }}
                  className={`action-button ${isDrawing ? 'active' : ''}`}
                >
                  {isDrawing ? 'Cancel Drawing' : 'Add Shape'}
                </button>
                
                <button 
                  onClick={handleSaveShapes}
                  className="save-shapes-button"
                  disabled={shapesData.length === 0}
                >
                  {shapesSaveStatus || 'Save Shapes'}
                </button>
              </div>

              {shapesData.length > 0 && (
                <div className="shapes-table-container">
                  <table className="shapes-table">
                    <thead>
                      <tr>
                        <th style={{ width: '150px' }}>Name</th>
                        <th>Frame</th>
                        <th>Color</th>
                        <th>Visible</th>
                        <th>Area (px²)</th>
                        <th>Points</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shapesData.map((shape) => (
                        <tr key={shape.id}>
                          <td>
                            <input
                              type="text"
                              value={shape.name}
                              onChange={(e) => handleShapeNameChange(shape.id, e.target.value)}
                              className="shape-name-input"
                              style={{ width: '140px' }}
                            />
                          </td>
                          <td 
                            onClick={() => playerRef.current?.seekTo(shape.frame)}
                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {shape.frame}
                          </td>
                          <td>
                            <input
                              type="color"
                              value={shape.color}
                              onChange={(e) => handleShapeColorChange(shape.id, e.target.value)}
                              className="shape-color-input"
                            />
                          </td>
                          <td>
                            <button
                              onClick={() => handleShapeVisibilityToggle(shape.id)}
                              className={`shape-visibility-button ${shape.visible ? 'visible' : ''}`}
                              title={shape.visible ? 'Hide shape' : 'Show shape'}
                            >
                              {shape.visible ? '👁️' : '👁️‍🗨️'}
                            </button>
                          </td>
                          <td>{shape.area}</td>
                          <td>{shape.points.length / 2}</td>
                          <td>
                            <button
                              onClick={() => handleDeleteShape(shape.id)}
                              className="delete-shape-button"
                              title="Delete shape"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <RangesSection 
          rangesExpanded={rangesExpanded}
          setRangesExpanded={setRangesExpanded}
          ranges={ranges}
          playerRef={playerRef}
          breakRange={breakRange}
          enforceRangeById={enforceRangeById}
        />

        <DictationDisplay 
          isListening={isListening} 
          transcript={transcript} 
          analysis={analysis}
          isProcessing={isProcessing}
          currentFrame={currentFrame}
          setNotes={setNotes}
          updateMetadata={updateMetadata}
          instructions={activeGroupInstructions}
        />

      </div>
    </Layout>
  );
}

export default VideoDetail;
