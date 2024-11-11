import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useParams, useLocation } from 'react-router-dom';
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
import { debounce } from 'lodash';
import { FaPencilAlt, FaSave } from 'react-icons/fa';
import { GlobalContext } from '../../index'; 
import Draggable from 'react-draggable';

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

  useEffect(() => {
    const fetchVideoDetails = async () => {
      try {
        const response = await axios.get(`${globalData.APIbaseUrl}/api/videos/${id}`);
        setVideo(response.data);
        setMetadata(JSON.stringify(response.data.metadata, null, 2));
        setParsedMetadata(response.data.metadata);
        
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
          setActiveGroupId(response.data[0].id);
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
        {Object.entries(currentGroup.shortcuts).map(([key, shortcut]) => (
          <li key={key}>'{key}': {shortcut.description}</li>
        ))}
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
        </div>

        {video.filepath.includes('backblaze') ? (
          <div className="video-player">
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
                          } catch (error) {
                            console.error('Error executing hotkey action:', error);
                          }
                        }
                      }}
                      className={`hotkey-action-button ${dragMode ? 'draggable' : ''}`}
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
            </>
          )}
        </div> 
      </div>
    </Layout>
  );
}

export default VideoDetail;
