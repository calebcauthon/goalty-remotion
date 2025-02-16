import React, { useState, useEffect, useContext, useRef } from 'react';
import Layout from './Layout';
import { GlobalContext } from '../../index';
import { Player } from '@remotion/player';
import VideoPlayer from 'components/VideoPlayer';
import './CVDatasets.css';

function CVDatasets() {
  const globalData = useContext(GlobalContext);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [currentRect, setCurrentRect] = useState(null);
  const [rectangles, setRectangles] = useState([]);
  const canvasRef = useRef(null);
  const [startPoint, setStartPoint] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(0.167); // 5fps = 0.167x speed
  const [mode, setMode] = useState('draw'); // 'draw' or 'drag'
  const [draggedRectIndex, setDraggedRectIndex] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [lastProcessedFrame, setLastProcessedFrame] = useState(null);
  const [activeRectangles, setActiveRectangles] = useState([]); // Rectangles that persist across frames
  const [rectangleHistory, setRectangleHistory] = useState([]); // Historical record of all positions
  const [showHistorical, setShowHistorical] = useState(true);
  const historicalCanvasRef = useRef(null);
  const [currentTag, setCurrentTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/videos`);
      const data = await response.json();
      
      const videosWithParsedMetadata = data.map(video => ({
        ...video,
        metadata: JSON.parse(video.metadata)
      }));
      
      setVideos(videosWithParsedMetadata);
    } catch (error) {
      setError('Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoSelect = (video) => {
    if (!video) return;
    
    const selectedVideoData = {
      id: video.id,
      url: video.filepath,
      name: video.title,
      title: video.title,
      size: video.size,
      filepath: video.filepath,
      metadata: video.metadata,
      uploadTimestamp: video.uploadTimestamp
    };
    
    setSelectedVideo(selectedVideoData);
  };

  const handleFrameUpdate = (frame) => {
    setCurrentFrame(frame);
    
    // Only create new entries if overlay is visible and we're actively tracking
    if (showOverlay && frame !== lastProcessedFrame && activeRectangles.length > 0) {
      // Record current positions of all active rectangles for this frame
      const newEntries = activeRectangles.map(rect => ({
        ...rect,
        frame: frame
      }));

      // Add new entries to history, avoiding duplicates
      setRectangleHistory(prevHistory => {
        const newHistory = [...prevHistory];
        
        newEntries.forEach(newEntry => {
          const isDuplicate = newHistory.some(
            existingRect => 
              existingRect.frame === newEntry.frame &&
              existingRect.x === newEntry.x &&
              existingRect.y === newEntry.y &&
              existingRect.width === newEntry.width &&
              existingRect.height === newEntry.height
          );

          if (!isDuplicate) {
            newHistory.push(newEntry);
          }
        });

        return newHistory;
      });

      setLastProcessedFrame(frame);
    }
  };

  const handleAdvanceFrame = () => {
    if (playerRef.current) {
      playerRef.current.seekTo(currentFrame + 1);
    }
  };

  const handlePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handlePreviousFrame = () => {
    if (playerRef.current) {
      playerRef.current.seekTo(Math.max(0, currentFrame - 1));
    }
  };

  const handleCanvasMouseDown = (e) => {
    if (!showOverlay) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (mode === 'drag') {
      // Find if we clicked on a rectangle - check activeRectangles instead of rectangles
      const clickedRectIndex = activeRectangles.findIndex(r => 
        x >= r.x && x <= r.x + r.width &&
        y >= r.y && y <= r.y + r.height
      );

      if (clickedRectIndex !== -1) {
        setDraggedRectIndex(clickedRectIndex);
        setDragOffset({
          x: x - activeRectangles[clickedRectIndex].x,
          y: y - activeRectangles[clickedRectIndex].y
        });
      }
      return;
    }

    // Drawing mode
    setDrawing(true);
    setStartPoint({ x, y });
    setCurrentRect({
      x,
      y,
      width: 0,
      height: 0
    });
  };

  const handleCanvasMouseMove = (e) => {
    if (!showOverlay) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (mode === 'drag' && draggedRectIndex !== null) {
      // Update active rectangles when dragging
      const updatedRectangles = [...activeRectangles];
      updatedRectangles[draggedRectIndex] = {
        ...updatedRectangles[draggedRectIndex],
        x: x - dragOffset.x,
        y: y - dragOffset.y
      };
      setActiveRectangles(updatedRectangles);
      return;
    }

    if (drawing) {
      setCurrentRect({
        x: Math.min(x, startPoint.x),
        y: Math.min(y, startPoint.y),
        width: Math.abs(x - startPoint.x),
        height: Math.abs(y - startPoint.y)
      });
    }
  };

  const handleCanvasMouseUp = () => {
    if (!showOverlay) return;

    if (mode === 'drag') {
      setDraggedRectIndex(null);
      return;
    }

    if (drawing) {
      const newRect = {
        ...currentRect,
        frame: currentFrame,
        tag: '' // Initialize empty tag
      };
      
      setActiveRectangles(prev => [...prev, newRect]);
      setRectangleHistory(prev => [...prev, newRect]);
      
      setDrawing(false);
      setStartPoint(null);
      setShowTagInput(true); // Show tag input after drawing
    }
  };

  const handleTagSubmit = (e) => {
    e.preventDefault();
    
    if (currentTag.trim()) {
      // Update the most recently added rectangle with the tag
      setActiveRectangles(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          tag: currentTag.trim()
        };
        return updated;
      });
      
      setRectangleHistory(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          tag: currentTag.trim()
        };
        return updated;
      });
      
      setCurrentTag('');
      setShowTagInput(false);
    }
  };

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Get boxes for current frame from history
      const currentFrameBoxes = rectangleHistory.filter(rect => rect.frame === currentFrame);
      
      // Draw boxes from history
      currentFrameBoxes.forEach((rect) => {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        
        if (mode === 'drag' && showOverlay) {
          ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
          ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        }
      });
      
      // Only draw active rectangles and current rectangle when overlay is visible
      if (showOverlay) {
        // Draw active rectangles that aren't in history yet
        activeRectangles.forEach((rect) => {
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 2;
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
          
          if (mode === 'drag') {
            ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
          }
        });
        
        // Draw current rectangle being drawn
        if (currentRect && mode === 'draw') {
          ctx.strokeStyle = '#0000ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
        }
      }
    }
  }, [activeRectangles, currentRect, showOverlay, mode, currentFrame, rectangleHistory]);

  useEffect(() => {
    if (historicalCanvasRef.current) {
      const ctx = historicalCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, historicalCanvasRef.current.width, historicalCanvasRef.current.height);
      
      if (showHistorical) {
        // Draw boxes from history for current frame
        const currentFrameBoxes = rectangleHistory.filter(rect => rect.frame === currentFrame);
        
        currentFrameBoxes.forEach((rect) => {
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 2;
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        });
      }
    }
  }, [currentFrame, rectangleHistory, showHistorical]);

  const handlePlaybackRateChange = (e) => {
    const fps = parseInt(e.target.value);
    const rate = fps / 29.8; // Convert FPS to playback rate
    setPlaybackRate(rate);
  };

  const getFpsLabel = (rate) => {
    const fps = Math.round(rate * 29.8);
    if (rate === 1) return 'Normal';
    return `${fps} FPS`;
  };

  // Update the table to show rectangle history
  const renderTableRows = () => {
    const sortedRectangles = [...rectangleHistory].sort((a, b) => {
      if (a.frame !== b.frame) {
        return a.frame - b.frame;
      }
      return rectangleHistory.indexOf(a) - rectangleHistory.indexOf(b);
    });

    return sortedRectangles.map((rect, index) => (
      <tr key={`${rect.frame}-${index}`}>
        <td>{index + 1}</td>
        <td>{rect.frame}</td>
        <td>{rect.tag || '-'}</td>
        <td>{Math.round(rect.x)}</td>
        <td>{Math.round(rect.y)}</td>
        <td>{Math.round(rect.width)}</td>
        <td>{Math.round(rect.height)}</td>
        <td>
          <button
            onClick={() => {
              setActiveRectangles(activeRectangles.filter((_, i) => i !== index));
              setRectangleHistory(rectangleHistory.filter((_, i) => i !== index));
            }}
            className="delete-button"
          >
            Delete
          </button>
        </td>
      </tr>
    ));
  };

  return (
    <Layout>
      <div className="cv-datasets">
        <h1>Create CV Datasets</h1>
        
        <div className="video-selector">
          <h2>Select a Video</h2>
          <select 
            onChange={(e) => {
              if (e.target.value) {
                const selectedVideo = videos.find(v => v.id === parseInt(e.target.value));
                handleVideoSelect(selectedVideo);
              } else {
                setSelectedVideo(null);
              }
            }}
            value={selectedVideo?.id || ''}
            disabled={loading}
            className="video-dropdown"
          >
            <option value="">Choose a video...</option>
            {videos.map(video => (
              <option key={video.id} value={video.id}>
                {video.title} ({(video.size / 1024 / 1024).toFixed(2)} MB)
              </option>
            ))}
          </select>

          {loading && <div className="status-message">Loading videos...</div>}
        </div>

        {selectedVideo && (
          <div className="video-container">
            <div className="video-section">
              <div className="video-wrapper">
                <Player
                  ref={playerRef}
                  component={VideoPlayer}
                  inputProps={{
                    src: selectedVideo.url,
                    onFrameUpdate: handleFrameUpdate
                  }}
                  durationInFrames={3000}
                  compositionWidth={800}
                  compositionHeight={450}
                  fps={29.8}
                  playbackRate={playbackRate}
                  controls
                />
                
                <canvas
                  ref={historicalCanvasRef}
                  width={800}
                  height={450}
                  className="historical-overlay"
                />
                
                {showOverlay && (
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={450}
                    className="drawing-overlay"
                    data-mode={mode}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                  />
                )}
              </div>
              
              {showTagInput && (
                <form onSubmit={handleTagSubmit} className="tag-input-form">
                  <input
                    type="text"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    placeholder="Enter tag for rectangle"
                    className="tag-input"
                    autoFocus
                  />
                  <button type="submit" className="control-button">
                    Save Tag
                  </button>
                </form>
              )}
              
              <div className="cv-video-controls">
                <button 
                  onClick={handlePlayPause}
                  className="control-button"
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button 
                  onClick={handlePreviousFrame}
                  className="control-button"
                >
                  Previous Frame
                </button>
                <button 
                  onClick={handleAdvanceFrame}
                  className="control-button"
                >
                  Next Frame
                </button>
                <button
                  onClick={() => setShowOverlay(!showOverlay)}
                  className="control-button"
                >
                  {showOverlay ? 'Hide Overlay' : 'Show Overlay'}
                </button>
                <button
                  onClick={() => setMode(mode === 'draw' ? 'drag' : 'draw')}
                  className={`control-button ${mode === 'drag' ? 'active' : ''}`}
                >
                  {mode === 'draw' ? 'Drag Boxes' : 'Draw Boxes'}
                </button>
                <button
                  onClick={() => setShowHistorical(!showHistorical)}
                  className={`control-button ${showHistorical ? 'active' : ''}`}
                >
                  {showHistorical ? 'Hide Historical' : 'Show Historical'}
                </button>
                <div className="frame-display">
                  Frame: {currentFrame}
                </div>
                <div className="fps-control">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={Math.round(playbackRate * 29.8)}
                    onChange={handlePlaybackRateChange}
                    className="fps-slider"
                  />
                  <span className="fps-label" data-normal={playbackRate === 1}>
                    {getFpsLabel(playbackRate)}
                  </span>
                </div>
              </div>
            </div>

            {rectangleHistory.length > 0 && (
              <div className="bounding-boxes">
                <h3>Bounding Boxes</h3>
                <table className="boxes-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Frame</th>
                      <th>Tag</th>
                      <th>X</th>
                      <th>Y</th>
                      <th>Width</th>
                      <th>Height</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderTableRows()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default CVDatasets; 