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

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    if (selectedVideo) {
      fetchFirstFrame();
    }
  }, [selectedVideo]);

  useEffect(() => {
    if (frameImage) {
      drawCanvas();
    }
  }, [frameImage, rectangles, currentRect]);

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

  const fetchFirstFrame = async () => {
    try {
      const response = await fetch(
        `${globalData.APIbaseUrl}/api/videos/first-frame`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: selectedVideo.url })
        }
      );
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        const img = new Image();
        img.onload = () => {
          setImageSize({ width: data.width, height: data.height });
          setFrameImage(img);
        };
        img.src = `data:image/jpeg;base64,${data.image}`;
      }
    } catch (error) {
      setError('Failed to fetch first frame');
    }
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
    setRectangles([]);
    setCurrentRect(null);
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

  const handleMouseUp = () => {
    if (!drawing || !currentRect) return;
    
    setRectangles(prev => [...prev, currentRect]);
    setDrawing(false);
    setCurrentRect(null);
  };

  if (loading) return (
    <Layout>
      <div className="player-tracking">
        <h1>Player Tracking</h1>
        <div>Loading...</div>
      </div>
    </Layout>
  );

  if (error) return (
    <Layout>
      <div className="player-tracking">
        <h1>Player Tracking</h1>
        <div className="error-message">{error}</div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="player-tracking">
        <h1>Player Tracking</h1>
        
        <div className="video-selector">
          <h2>Select a Video</h2>
          <select 
            onChange={(e) => handleVideoSelect(videos.find(v => v.id === e.target.value))}
            value={selectedVideo?.id || ''}
          >
            <option value="">Choose a video...</option>
            {videos.map(video => (
              <option key={video.id} value={video.id}>
                {video.name} ({(video.size / 1024 / 1024).toFixed(2)} MB)
              </option>
            ))}
          </select>
        </div>

        {frameImage && (
          <div className="frame-container">
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
            <textarea
              className="coordinates-display"
              value={rectangles.map(rect => 
                `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)},${Math.round(rect.height)}`
              ).join('\n')}
              readOnly
              rows={rectangles.length + 1}
            />
          </div>
        )}

        {selectedVideo && !frameImage && (
          <div className="video-details">
            <h3>Selected Video: {selectedVideo.name}</h3>
            <p>Size: {(selectedVideo.size / 1024 / 1024).toFixed(2)} MB</p>
            <p>Uploaded: {new Date(selectedVideo.uploadTimestamp).toLocaleString()}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default PlayerTracking; 