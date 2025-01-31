import React, { useState, useEffect, useContext, useRef } from 'react';
import Layout from './Layout';
import { GlobalContext } from '../../index';
import './PlayerTracking.css';

function PlayerTracking() {
  const globalData = useContext(GlobalContext);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [frameImage, setFrameImage] = useState(null);
  const [rectangles, setRectangles] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [currentRect, setCurrentRect] = useState(null);
  const canvasRef = useRef(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [outputFilename, setOutputFilename] = useState('');
  const [processing, setProcessing] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const [clipResults, setClipResults] = useState(null);
  const [clipPrompt, setClipPrompt] = useState('');
  const [clipLoading, setClipLoading] = useState(false);
  const [videoRef, setVideoRef] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [clipBoxes, setClipBoxes] = useState([]);
  const [drawMode, setDrawMode] = useState('draw');
  const [startFrame, setStartFrame] = useState(0);
  const [endFrame, setEndFrame] = useState(0);

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    if (selectedVideo) {
      fetchVideoInfo();
    }
  }, [selectedVideo]);

  useEffect(() => {
    if (frameImage) {
      drawCanvas();
    }
  }, [frameImage, rectangles, currentRect]);

  useEffect(() => {
    if (videoInfo) {
      setEndFrame(videoInfo.frame_count);
    }
  }, [videoInfo]);

  useEffect(() => {
    if (selectedVideo && startFrame >= 0) {
      fetchVideoInfo(startFrame);
    }
  }, [startFrame]);

  const fetchVideos = async () => {
    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/list-b2-videos`);
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setVideos(data.files);
      }
    } catch (error) {
      setError('Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoInfo = async (frameNumber = 0) => {
    try {
      const b2Response = await fetch(
        `${globalData.APIbaseUrl}/api/videos/b2-info`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            url: selectedVideo.url,
            frame_number: frameNumber
          })
        }
      );
      const b2Data = await b2Response.json();
      
      if (b2Data.error) {
        console.error(b2Data.error);
        setError(b2Data.error);
      } else {
        setVideoInfo(b2Data);
        
        // Create and set the frame image
        const img = new Image();
        img.onload = () => {
          setImageSize({ width: b2Data.width, height: b2Data.height });
          setFrameImage(img);
        };
        img.src = `data:image/jpeg;base64,${b2Data.frame_image}`;
        
        // If boxes_data exists, process it
        if (b2Data.boxes_data) {
          // Convert the boxes data to rectangle format
          const boxRectangles = b2Data.boxes_data.map(boxFrame => {
            // Assuming each frame has bbox_to_vis data
            const rects = [];
            for (const [id, box] of Object.entries(boxFrame)) {
              rects.push({
                x: box[0],
                y: box[1],
                width: box[2],
                height: box[3],
                id: id,
                name: id
              });
            }
            return rects;
          });
          
          // For now, just use the first frame's boxes
          if (boxRectangles.length > 0) {
            setRectangles(boxRectangles[0]);
          }
        }
      }
    } catch (error) {
      setError('Failed to fetch video info');
    }
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
    setRectangles([]);
    setCurrentRect(null);
    setClipBoxes([]);
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
    
    // Draw all completed rectangles
    rectangles.forEach(rect => {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      
      // Add semi-transparent fill for completed rectangles
      ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    });
    
    // Draw CLIP detection boxes
    clipBoxes.forEach(box => {
      ctx.strokeStyle = '#ff0000';  // Red for CLIP boxes
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
      ctx.fillRect(box.x, box.y, box.width, box.height);
      
      // Draw label
      ctx.font = '14px Arial';
      ctx.fillStyle = '#ff0000';
      ctx.fillText(box.label, box.x, box.y - 5);
    });
    
    // Draw current rectangle if drawing
    if (currentRect) {
      ctx.strokeStyle = '#ff0000'; // Red for the active rectangle
      ctx.lineWidth = 2;
      ctx.strokeRect(
        currentRect.x,
        currentRect.y,
        currentRect.width,
        currentRect.height
      );
      
      // Add semi-transparent fill for the current rectangle
      ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
      ctx.fillRect(
        currentRect.x,
        currentRect.y,
        currentRect.width,
        currentRect.height
      );
    }
  };

  const getScaledCoordinates = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e) => {
    const coords = getScaledCoordinates(e, canvasRef.current);
    setDrawing(true);
    setCurrentRect({ x: coords.x, y: coords.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!drawing || !currentRect) return;
    
    const coords = getScaledCoordinates(e, canvasRef.current);
    
    // Calculate width and height based on original starting point
    const width = coords.x - currentRect.x;
    const height = coords.y - currentRect.y;
    
    // Update currentRect with new dimensions
    setCurrentRect(prev => ({
      ...prev,
      width,
      height
    }));
    
    // Immediately redraw canvas
    requestAnimationFrame(drawCanvas);
  };

  const handleRectangleComplete = (newRect) => {
    if (drawMode === 'draw') {
      setRectangles(prev => [...prev, { ...newRect, name: '' }]);
    } else if (drawMode === 'keep') {
      setRectangles(prev => prev.filter(rect => 
        rect.x >= newRect.x && 
        rect.y >= newRect.y && 
        (rect.x + rect.width) <= (newRect.x + newRect.width) && 
        (rect.y + rect.height) <= (newRect.y + newRect.height)
      ));
    } else if (drawMode === 'remove') {
      setRectangles(prev => prev.filter(rect => 
        !(rect.x >= newRect.x && 
          rect.y >= newRect.y && 
          (rect.x + rect.width) <= (newRect.x + newRect.width) && 
          (rect.y + rect.height) <= (newRect.y + newRect.height))
      ));
    }
  };

  const handleNameChange = (index, name) => {
    setRectangles(prev => prev.map((rect, i) => 
      i === index ? { ...rect, name } : rect
    ));
  };

  const handleMouseUp = () => {
    if (!drawing || !currentRect) return;
    
    handleRectangleComplete(currentRect);
    setDrawing(false);
    setCurrentRect(null);
  };

  const handleCloudRender = async () => {
    if (!outputFilename) {
      setError('Please enter an output filename');
      return;
    }

    // Combine manual rectangles and CLIP boxes
    const allRectangles = [
      ...rectangles.map(r => ({
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        name: r.name,
        source: 'manual'
      })),
      ...clipBoxes.map(box => ({
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        label: box.label,
        source: 'clip'
      }))
    ];

    if (allRectangles.length === 0) {
      setError('No rectangles or detections found');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/videos/process-tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rectangles: allRectangles,
          sourceUrl: selectedVideo.url,
          outputFilename: outputFilename.endsWith('.mp4') ? outputFilename : `${outputFilename}.mp4`,
          startFrame,
          endFrame
        })
      });

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        alert('Processing started successfully!');
      }
    } catch (error) {
      setError('Failed to start processing');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteRectangle = (index) => {
    setRectangles(prev => prev.filter((_, i) => i !== index));
  };

  const handleClipAnalysis = async () => {
    if (!clipPrompt) {
      setError('Please enter a text prompt');
      return;
    }

    setClipLoading(true);
    setError(null);

    try {
      const frameNumber = Math.floor(currentTime * 30); // Assuming 30fps

      const response = await fetch(`${globalData.APIbaseUrl}/api/videos/clip-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_url: selectedVideo.url,
          frame_number: frameNumber,
          text_prompt: clipPrompt
        })
      });

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setClipResults(data);
        // Add CLIP detections directly to rectangles array
        if (data.detections) {
          const clipRects = data.detections.map(d => ({
            x: d.bbox[0],
            y: d.bbox[1],
            width: d.bbox[2] - d.bbox[0],
            height: d.bbox[3] - d.bbox[1],
            label: d.label,
            source: 'clip'
          }));
          setRectangles(prev => [...prev, ...clipRects]);
        }
      }
    } catch (error) {
      setError('Failed to perform CLIP analysis');
    } finally {
      setClipLoading(false);
    }
  };

  const ClipResultsDisplay = ({ results }) => {
    if (!results) return null;

    return (
      <div className="clip-results">
        <h3>CLIP Analysis Results</h3>
        <p>Similarity Score: {(results.similarity_score * 100).toFixed(2)}%</p>
        <img 
          src={`data:image/jpeg;base64,${results.frame_image}`} 
          alt="CLIP analysis frame"
          style={{ maxWidth: '100%', marginTop: '10px' }}
        />
      </div>
    );
  };

  const videoPlayerJsx = (
    <div className="video-player-container">
      <video
        ref={ref => setVideoRef(ref)}
        src={selectedVideo?.url}
        controls
        style={{ maxWidth: '100%', marginBottom: '1rem' }}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
      />
    </div>
  );

  const handlePullBoxes = async () => {
    if (!videoRef || !selectedVideo) return;
    
    const frameNumber = Math.floor(videoRef.currentTime * (videoInfo?.fps || 30));
    
    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/videos/get-boxes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_url: selectedVideo.url,
          frame_number: frameNumber
        })
      });

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else if (data.boxes) {
        // Convert boxes to rectangle format
        const newRects = Object.entries(data.boxes).map(([id, boxData]) => {
          // boxData.bbox is [x, y, w, h] format
          const [x, y, w, h] = boxData.bbox;
          return {
            x: x,
            y: y,
            width: w,
            height: h,
            id: id,
            name: id
          };
        });
        
        console.log('New rectangles:', newRects);
        setRectangles(newRects);
      }
    } catch (error) {
      console.error('Error fetching boxes data:', { error });
      setError(`Failed to fetch boxes data: ${error}`);
    }
  };

  const tableJsx = (
    <table className="coordinates-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>X</th>
          <th>Y</th>
          <th>Width</th>
          <th>Height</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {rectangles.map((rect, index) => (
          <tr key={index}>
            <td>
              <input
                type="text"
                value={rect.name || ''}
                onChange={(e) => handleNameChange(index, e.target.value)}
                placeholder="Player name"
                style={{ width: '100px' }}
              />
            </td>
            <td>{Math.round(rect.x)}</td>
            <td>{Math.round(rect.y)}</td>
            <td>{Math.round(rect.width)}</td>
            <td>{Math.round(rect.height)}</td>
            <td>
              <button
                className="delete-rectangle-button"
                onClick={() => handleDeleteRectangle(index)}
                title="Delete rectangle"
              >
                🗑️
              </button>
            </td>
          </tr>
        ))}
        {rectangles.length === 0 && (
          <tr>
            <td colSpan="6" className="no-rectangles">
              No rectangles drawn yet
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  const handleSetCurrentFrame = () => {
    if (videoRef && videoRef.currentTime) {
      const frameNumber = Math.floor(videoRef.currentTime * (videoInfo?.fps || 30));
      setStartFrame(frameNumber);
    }
  };

  const handleSetVideoFrame = () => {
    if (videoRef && startFrame >= 0) {
      // Set video time based on frame number
      videoRef.currentTime = startFrame / (videoInfo?.fps || 30);
      // Fetch the frame image
      fetchVideoInfo(startFrame);
    }
  };

  const handleSetEndFrame = () => {
    if (videoRef && videoRef.currentTime) {
      const frameNumber = Math.floor(videoRef.currentTime * (videoInfo?.fps || 30));
      setEndFrame(frameNumber);
    }
  };

  return (
    <Layout>
      <div className="player-tracking">
        <h1>Player Tracking</h1>
        
        <div className="video-selector">
          <h2>Select a Video</h2>
          <select 
            onChange={(e) => handleVideoSelect(videos.find(v => v.id === e.target.value))}
            value={selectedVideo?.id || ''}
            disabled={loading}
          >
            <option value="">Choose a video...</option>
            {videos.map(video => (
              <option key={video.id} value={video.id}>
                {video.name} ({(video.size / 1024 / 1024).toFixed(2)} MB)
              </option>
            ))}
          </select>
          {loading && <div className="status-message">Loading videos...</div>}
        </div>

        {selectedVideo && (
          <div className="video-details">
            <h3>Selected Video: {selectedVideo.name}</h3>
            <div className="video-info-grid">
              <div>Size: {(selectedVideo.size / 1024 / 1024).toFixed(2)} MB</div>
              <div>Uploaded: {new Date(selectedVideo.uploadTimestamp).toLocaleString()}</div>
              {videoInfo && (
                <>
                  <div>Frames: {videoInfo.frame_count}</div>
                  <div>Duration: {videoInfo.duration}s</div>
                  <div>Resolution: {videoInfo.width}x{videoInfo.height}</div>
                  <div>FPS: {videoInfo.fps}</div>
                </>
              )}
            </div>
          </div>
        )}

        {frameImage && (
          <div className="frame-container">
            {videoPlayerJsx}
            <div className="drawing-modes">
              <label>
                <input
                  type="radio"
                  value="draw"
                  checked={drawMode === 'draw'}
                  onChange={(e) => setDrawMode(e.target.value)}
                />
                Draw
              </label>
              <label>
                <input
                  type="radio"
                  value="keep"
                  checked={drawMode === 'keep'}
                  onChange={(e) => setDrawMode(e.target.value)}
                />
                Keep Inside
              </label>
              <label>
                <input
                  type="radio"
                  value="remove"
                  checked={drawMode === 'remove'}
                  onChange={(e) => setDrawMode(e.target.value)}
                />
                Remove Inside
              </label>
            </div>
            <canvas
              ref={canvasRef}
              width={imageSize.width}
              height={imageSize.height}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="frame-canvas"
            />
            <div className="coordinates-table-container">
              <button 
                onClick={handlePullBoxes}
                className="pull-boxes-button"
                disabled={!videoRef || !selectedVideo}
              >
                Pull boxes for frame {videoRef ? Math.floor(videoRef.currentTime * (videoInfo?.fps || 30)) : 0}
              </button>
              {tableJsx}
            </div>
            <div className="render-controls">
              <div className="filename-input">
                <label htmlFor="output-filename">Save as:</label>
                <input
                  id="output-filename"
                  type="text"
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  placeholder="output.mp4"
                />
              </div>
              
              <div className="clip-controls">
                <div className="clip-input">
                  <label htmlFor="clip-prompt">CLIP Prompt:</label>
                  <input
                    id="clip-prompt"
                    type="text"
                    value={clipPrompt}
                    onChange={(e) => setClipPrompt(e.target.value)}
                    placeholder="Describe what to look for..."
                  />
                  <button
                    className="clip-analyze-button"
                    onClick={handleClipAnalysis}
                    disabled={clipLoading || !clipPrompt || !selectedVideo}
                  >
                    {clipLoading ? 'Analyzing...' : 'Analyze with CLIP'}
                  </button>
                </div>
              </div>

              <div className="frame-range-controls">
                <div>
                  <label htmlFor="start-frame">Start Frame:</label>
                  <input
                    id="start-frame"
                    type="number"
                    min="0"
                    max={videoInfo?.frame_count || 0}
                    value={startFrame}
                    onChange={(e) => setStartFrame(parseInt(e.target.value))}
                  />
                  <button 
                    className="set-frame-button"
                    onClick={handleSetVideoFrame}
                    title="Set video to this frame"
                    disabled={!videoRef || !selectedVideo}
                  >
                    ⏯️
                  </button>
                  <button 
                    className="set-current-frame-button"
                    onClick={handleSetCurrentFrame}
                    title="Set to current frame"
                  >
                    📍
                  </button>
                </div>
                <div>
                  <label htmlFor="end-frame">End Frame:</label>
                  <input
                    id="end-frame"
                    type="number"
                    min={startFrame}
                    max={videoInfo?.frame_count || 0}
                    value={endFrame}
                    onChange={(e) => setEndFrame(parseInt(e.target.value))}
                  />
                  <button 
                    className="set-current-frame-button"
                    onClick={handleSetEndFrame}
                    title="Set to current frame"
                  >
                    📍
                  </button>
                </div>
              </div>

              <div className="render-status">
                {error && <div className="error-message">{error}</div>}
                <button
                  className="cloud-render-button"
                  onClick={handleCloudRender}
                  disabled={processing || !outputFilename || rectangles.length === 0}
                >
                  {processing ? 'Processing...' : 'Cloud Render'}
                </button>
              </div>
            </div>
          </div>
        )}

        {clipResults && <ClipResultsDisplay results={clipResults} />}
      </div>
    </Layout>
  );
}

export default PlayerTracking; 