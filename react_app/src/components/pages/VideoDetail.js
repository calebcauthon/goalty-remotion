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
import { HotkeySection } from '../HotkeySection';
import { useAutoListen } from '../hotkeys/AutoListen';

const VideoInfoUpdater = ({ video, globalData, onUpdate }) => {
  const [loading, setLoading] = useState(false);

  const handlePullB2Data = async () => {
    setLoading(true);
    try {
      const b2Response = await fetch(
        `${globalData.APIbaseUrl}/api/videos/b2-info`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            url: video.filepath,
            frame_number: 0
          })
        }
      );
      const b2Data = await b2Response.json();
      
      if (b2Data.error) {
        console.error(b2Data.error);
      } else {
        onUpdate({
          fps: b2Data.fps,
          duration: b2Data.duration,
        });
      }
    } catch (error) {
      console.error('Failed to fetch video info:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePullB2Data}
      disabled={loading}
      style={{
        padding: '8px 16px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        marginLeft: '10px'
      }}
    >
      {loading ? 'Loading...' : 'Update Video Info'}
    </button>
  );
};

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
  const [turnedOnInstructions, setTurnedOnInstructions] = useState(new Set());
  const {
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
  const [clickFeedback, setClickFeedback] = useState(null);
  const [feedbackTimeout, setFeedbackTimeout] = useState(null);
  const [showMissButtons, setShowMissButtons] = useState(false);
  const [currentBoxes, setCurrentBoxes] = useState(null);
  const [autoRefreshBoxes, setAutoRefreshBoxes] = useState(false);
  const [lastBoxUpdate, setLastBoxUpdate] = useState(null);

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
        setButtonOrder(Object.keys(currentGroup.shortcuts.shortcuts ? currentGroup.shortcuts.shortcuts : currentGroup.shortcuts));
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
    setDictationCurrentFrame(frame);
    setStartFrameForAuto(frame);
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
  const {
    isAutoListening,
    autoTranscript,
    isAutoProcessing,
    startAutoListening,
    stopAutoListening,
    setAutoNotes,
    setStartFrameForAuto
  } = useAutoListen({ playerRef, GlobalContext }, currentFrame);

  const getCurrentHotkeys = useCallback(() => {
    if (!hotkeyGroups.length || activeGroupId === null) return {};
    
    const currentGroup = hotkeyGroups.find(group => group.id === activeGroupId);
    if (!currentGroup || !currentGroup.shortcuts) return {};

    const hotkeys = {};
    Object.entries(currentGroup.shortcuts.shortcuts ? currentGroup.shortcuts.shortcuts : currentGroup.shortcuts).forEach(([key, shortcut]) => {
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

  const handleFetchBoxes = async (silent = false) => {
    if (!silent) setBoxesLoading(true);
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
      setBoxesData(data.boxes);
      
      // Update the metadata
      const newMetadata = JSON.parse(metadata);
      newMetadata.boxes = data.boxes;
      setMetadata(JSON.stringify(newMetadata, null, 2));
      setParsedMetadata(newMetadata);

      // Save metadata automatically
      await axios.post(`${globalData.APIbaseUrl}/api/videos/${id}/metadata`, { 
        metadata: JSON.stringify(newMetadata, null, 2) 
      });

      setLastBoxUpdate(new Date().toLocaleTimeString());

      if (!silent) {
        alert('Boxes data loaded and saved successfully');
      }
      
    } catch (error) {
      console.error('Error fetching boxes:', error);
      if (!silent) {
        alert('Failed to fetch boxes data');
      }
    } finally {
      if (!silent) setBoxesLoading(false);
    }
  };

  useEffect(() => {
    setCurrentFrame(currentFrame);
  }, [currentFrame, setCurrentFrame]);

  useEffect(() => {
    const notesText = Array.from(turnedOnInstructions)
      .map(instruction => typeof instruction === 'object' ? instruction.text : instruction)
      .join('\n');
    setNotes(notesText);
    setAutoNotes(notesText);
  }, [turnedOnInstructions, setNotes, setAutoNotes]);

  const handleVideoClick = useCallback((e) => {
    // Clear any existing feedback timeout
    if (feedbackTimeout) {
      clearTimeout(feedbackTimeout);
    }
    
    // Get click coordinates for feedback (these are the raw click coordinates)
    const clickX = e.clientX - e.target.getBoundingClientRect().left;
    const clickY = e.clientY - e.target.getBoundingClientRect().top;

    console.log('Video clicked!');
    
    // Get click coordinates relative to video player
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    console.log('Click coordinates (relative):', { x, y });

    // Scale coordinates to match original video dimensions
    const scaleX = videoMetadata?.width / desiredWidth;
    const scaleY = videoMetadata?.height / (desiredWidth * (videoMetadata?.height / videoMetadata?.width));
    const originalX = x * scaleX;
    const originalY = y * scaleY;
    console.log('Click coordinates (scaled):', { originalX, originalY });
    console.log('Scale factors:', { scaleX, scaleY });

    // Check if we have boxes data for current frame
    const frameBoxes = parsedMetadata?.boxes?.[currentFrame];
    console.log('Current frame:', currentFrame);
    console.log('Available boxes for frame:', frameBoxes);
    if (!frameBoxes) {
      console.log('No boxes found for current frame');
      return;
    }

    // Find box containing click coordinates
    let clickedPlayer = null;
    let clickedBox = null;

    Object.entries(frameBoxes).forEach(([playerName, { bbox }]) => {
      const [x, y, width, height] = bbox;
      const padding = 20 * scaleX; // Scale padding to match video coordinates
      const isInBox = (
        originalX >= x - padding &&
        originalX <= x + width + padding &&
        originalY >= y - padding &&
        originalY <= y + height + padding
      );
      console.log('Checking box for player:', playerName, [x,y,width,height], 'Contains click?', isInBox, 'Padding:', padding);
      
      if (isInBox) {
        clickedPlayer = playerName;
        clickedBox = bbox;
      }
    });

    if (clickedPlayer && clickedBox) {
      console.log('Found clicked box:', clickedBox, 'for player:', clickedPlayer, { parsedMetadataTags: parsedMetadata.tags });
      
      // Determine action based on current tags before update
      const lastAction = getLastAction(parsedMetadata.tags || [], clickedPlayer);
      const newAction = lastAction === 'catch' ? 'throw' : 'catch';
      console.log('Determined action:', newAction, 'based on last action:', lastAction);

      // Create new tag
      updateMetadata(prevMetadata => {
        const newMetadata = { ...prevMetadata };
        if (!newMetadata.tags) newMetadata.tags = [];
        
        const newTag = {
          name: `${clickedPlayer} ${newAction}`,
          frame: currentFrame,
          x: originalX,
          y: originalY,
          box: clickedBox,
          player: clickedPlayer,
          action: newAction
        };
        console.log('Creating new tag:', newTag);
        
        newMetadata.tags.push(newTag);
        return newMetadata;
      });
      
      // Auto-save metadata
      handleSaveMetadata();
      
      // Show feedback
      setClickFeedback({
        x: clickX,
        y: clickY,
        hit: true,
        text: newAction.toUpperCase()
      });

      // Clear any miss boxes/buttons
      setShowMissButtons(false);
      setCurrentBoxes(null);
    } else {
      console.log('No box found containing click coordinates');
      
      // Show miss feedback
      setClickFeedback({
        x: clickX,
        y: clickY,
        hit: false,
        text: 'MISS'
      });

      // Pause video and show player buttons
      if (playerRef.current) {
        playerRef.current.pause();
      }

      // Get current frame's boxes
      const frameBoxes = parsedMetadata?.boxes?.[currentFrame];
      if (frameBoxes) {
        setCurrentBoxes(frameBoxes);
        setShowMissButtons(true);
      }
    }
    
    // Clear feedback after 1 second
    const timeout = setTimeout(() => {
      setClickFeedback(null);
    }, 1000);
    setFeedbackTimeout(timeout);
  }, [currentFrame, parsedMetadata]);

  const handlePlayerButtonClick = (playerName, bbox) => {
    // Create tag as if player was clicked
    updateMetadata(prevMetadata => {
      const newMetadata = { ...prevMetadata };
      if (!newMetadata.tags) newMetadata.tags = [];
      
      const lastAction = getLastAction(newMetadata.tags || [], playerName);
      const newAction = lastAction === 'catch' ? 'throw' : 'catch';
      
      const newTag = {
        name: `${playerName} ${newAction}`,
        frame: currentFrame,
        x: bbox[0] + bbox[2]/2, // center x of box
        y: bbox[1] + bbox[3]/2, // center y of box
        box: bbox,
        player: playerName,
        action: newAction
      };
      
      newMetadata.tags.push(newTag);
      return newMetadata;
    });
    
    // Auto-save metadata
    handleSaveMetadata();
    
    // Hide buttons and resume playback
    setShowMissButtons(false);
    setCurrentBoxes(null);
    if (playerRef.current) {
      playerRef.current.play();
    }
  };

  const PlayerBoxOverlay = ({ boxes }) => {
    if (!boxes) return null;

    const desiredWidth = 800;
    const scale = desiredWidth / videoMetadata?.width;

    return (
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {Object.entries(boxes).map(([playerName, { bbox }]) => {
          const [x, y, width, height] = bbox;
          return (
            <div
              key={playerName}
              style={{
                position: 'absolute',
                left: x * scale,
                top: y * scale,
                width: width * scale,
                height: height * scale,
                border: '2px solid red',
                boxSizing: 'border-box'
              }}
            />
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    let intervalId;
    
    if (autoRefreshBoxes) {
      // Initial fetch
      handleFetchBoxes(true);
      
      // Set up interval
      intervalId = setInterval(() => {
        handleFetchBoxes(true);
      }, 10000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefreshBoxes]);

  if (loading) {
    return <Layout><div>Loading...</div></Layout>;
  }

  if (!video) {
    return <Layout><div>Video not found</div></Layout>;
  }

  const desiredWidth = 800;

  const shortcutActions = {
    'a': () => seekBackward(),
    'd': () => seekForward(),
    // ... map all your shortcuts to their corresponding functions
  };

  const ClickFeedback = ({ feedback }) => {
    if (!feedback) return null;
    
    const borderColor = feedback.hit ? '#4CAF50' : '#f44336';
    
    return (
      <div style={{
        position: 'absolute',
        left: feedback.x - 30,
        top: feedback.y - 30,
        width: '60px',
        height: '60px',
        border: `2px solid ${borderColor}`,
        borderRadius: '2px',
        pointerEvents: 'none',
        zIndex: 1000
      }}>
        <div style={{
          position: 'absolute',
          top: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.5)',
          color: 'white',
          fontSize: '12px',
          padding: '2px 6px',
          borderRadius: '2px',
          whiteSpace: 'nowrap'
        }}>
          {feedback.text}
        </div>
      </div>
    );
  };

  // Update the helper function to consider both player-specific and global context
  const getLastAction = (tags, player) => {
    // Get all catch/throw tags, sorted by frame
    const allCatchThrowTags = tags
      ?.filter(tag => (tag.name.includes('catch') || tag.name.includes('throw')) && (tag.frame || 0) <= currentFrame)
      .sort((a, b) => (b.frame || 0) - (a.frame || 0));

    console.log('All catch/throw tags:', allCatchThrowTags);

    // Get the most recent tag by any player
    const mostRecentTag = allCatchThrowTags?.[0];
    console.log('Most recent tag:', mostRecentTag);

    // If this is a different player than the last action, it must be a catch
    if (mostRecentTag && mostRecentTag.player !== player) {
      console.log('Different player from last action, forcing catch');
      return 'throw'; // Return 'throw' so new action will be 'catch'
    }

    // Get the most recent tag by this specific player
    const lastPlayerTag = allCatchThrowTags
      ?.filter(tag => tag.player === player)[0];
    console.log('Last tag for player:', player, lastPlayerTag);

    // If no previous tags, start with catch
    if (!lastPlayerTag) {
      console.log('No previous tags for player, starting with catch');
      return 'throw'; // Return 'throw' so new action will be 'catch'
    }

    // Use the last action to determine next action
    const lastAction = lastPlayerTag.name.includes('catch') ? 'catch' : 'throw';
    console.log('Last action was:', lastAction, 'so next action will be:', lastAction === 'catch' ? 'throw' : 'catch');
    return lastAction;
  };

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
                onFrameUpdate: handleFrameUpdate,
                onClick: handleVideoClick
              }}
              durationInFrames={durationInFrames}
              compositionWidth={desiredWidth}
              compositionHeight={Math.round(desiredWidth * (videoMetadata?.height / videoMetadata?.width))}
              playbackRate={playbackRate}
              fps={29.85}
              controls
              renderLoading={() => <div>Loading...</div>}
            />
            <ClickFeedback feedback={clickFeedback} />
            {showMissButtons && <PlayerBoxOverlay boxes={currentBoxes} />}
            
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

        <HotkeySection 
          hotkeyMode={hotkeyMode}
          toggleHotkeyMode={toggleHotkeyMode}
          hotkeyGroups={hotkeyGroups}
          activeGroupId={activeGroupId}
          setActiveGroupId={setActiveGroupId}
          setActiveGroupInstructions={setActiveGroupInstructions}
          setTurnedOnInstructions={setTurnedOnInstructions}
          turnedOnInstructions={turnedOnInstructions}
          buttonOrder={buttonOrder}
          setButtonOrder={setButtonOrder}
          buttonPositions={buttonPositions}
          setButtonPositions={setButtonPositions}
          dragMode={dragMode}
          setDragMode={setDragMode}
          activeIncrementButtons={activeIncrementButtons}
          setActiveIncrementButtons={setActiveIncrementButtons}
          hotkeyButtonsExpanded={hotkeyButtonsExpanded}
          setHotkeyButtonsExpanded={setHotkeyButtonsExpanded}
          hotkeysExpanded={hotkeysExpanded}
          setHotkeysExpanded={setHotkeysExpanded}
          globalData={globalData}
          shortcutActions={getCurrentHotkeys()}
        />

        <div className="metadata-container" style={{ border: 'none' }}>
          <button 
            onClick={handleSaveMetadata} 
            disabled={!!jsonError}
            className="action-button"
          >
            {saveButtonText}
          </button>
        </div>

        <div className="video-info">
          <div className="video-info-header" onClick={() => setVideoInfoExpanded(!videoInfoExpanded)}>
            <h3>Video Info {videoInfoExpanded ? '▼' : '▶'}</h3>
            <VideoInfoUpdater 
              video={video}
              globalData={globalData}
              onUpdate={(newData) => {
                setVideoMetadata(prev => ({
                  ...prev,
                  ...newData
                }));
                // Update duration in frames based on new FPS
                console.log('newData', newData);
                setDurationInFrames(Math.ceil(newData.duration * newData.fps));
              }}
            />
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                <button 
                  onClick={() => handleFetchBoxes(false)}
                  disabled={boxesLoading}
                  className="action-button"
                >
                  {boxesLoading ? 'Loading Boxes...' : 'Load Boxes Data'}
                </button>

                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input
                    type="checkbox"
                    checked={autoRefreshBoxes}
                    onChange={(e) => setAutoRefreshBoxes(e.target.checked)}
                  />
                  Auto-refresh every 10s
                </label>

                {lastBoxUpdate && (
                  <span style={{ fontSize: '0.9em', color: '#666' }}>
                    Last updated: {lastBoxUpdate}
                  </span>
                )}
              </div>
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
          instructions={turnedOnInstructions}
        />

        <DictationDisplay 
          isListening={isAutoListening} 
          transcript={autoTranscript} 
          isProcessing={isAutoProcessing}
          currentFrame={currentFrame}
          setNotes={setAutoNotes}
          updateMetadata={updateMetadata}
          instructions={turnedOnInstructions}
          isAuto={true}
        />

        {showMissButtons && currentBoxes && (
          <div className="player-buttons" style={{ 
            display: 'flex', 
            gap: '10px', 
            padding: '10px',
            justifyContent: 'center'
          }}>
            {Object.entries(currentBoxes).map(([playerName, { bbox }]) => (
              <button
                key={playerName}
                onClick={() => handlePlayerButtonClick(playerName, bbox)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {playerName}
              </button>
            ))}
          </div>
        )}

      </div>
    </Layout>
  );
}

export default VideoDetail;
