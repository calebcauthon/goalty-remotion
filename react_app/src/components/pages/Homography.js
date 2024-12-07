import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import Layout from './Layout';
import { GlobalContext } from '../../index';
import { findPlayerSequences } from '../stats/statUtils';
import './Homography.css';
import { Player } from '@remotion/player';
import { VideoWithBoxes } from '../templates/VideoWithBoxes';

function Homography() {
  const globalData = useContext(GlobalContext);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [playerSequences, setPlayerSequences] = useState({});
  const [boxes, setBoxes] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());
  const canvasRef = useRef(null);
  const [transformedPoints, setTransformedPoints] = useState([]);
  const [fieldPoints, setFieldPoints] = useState(null);
  const [testPoint, setTestPoint] = useState({ x: 0, y: 0 });
  const [testResult, setTestResult] = useState(null);
  const [playerPoints, setPlayerPoints] = useState([]);
  const [bounding_box_dimensions, setBoundingBoxDimensions] = useState([960, 540]);
  const [metadata, setMetadata] = useState(null);

  // Constants for visualization
  const FIELD_WIDTH = 400;
  const FIELD_HEIGHT = 600;
  const POINT_RADIUS = 4;

  // scale factors
  const polygon_boundary_dimensions = [800, 600];
  const x_scale = polygon_boundary_dimensions[0] / bounding_box_dimensions[0];
  const y_scale = polygon_boundary_dimensions[1] / bounding_box_dimensions[1];

  const x_scale_bbox = useMemo(() => {
    if (!metadata) return 1;
    const value = 1280 / metadata.width;
    console.log('x_scale_bbox', { value, metadata });
    return value;
  }, [metadata]);
  const y_scale_bbox = useMemo(() => {
    if (!metadata) return 1;
    const value = 720 / metadata.height;
    console.log('y_scale_bbox', { value, metadata });
    return value;
  }, [metadata]);

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    if (selectedVideo?.metadata) {
      const metadata = JSON.parse(selectedVideo.metadata);
      const boxesData = metadata.boxes || [];
      setBoxes(boxesData);
      
      // Extract field points from metadata
      if (metadata.shapes) {
        const homographyShape = metadata.shapes.find(shape => shape.name === 'homography_buckets');
        if (homographyShape && homographyShape.points.length === 8) {
          // Convert points array [x1,y1,x2,y2,...] to array of points [[x1,y1], [x2,y2],...]
          const points = [];
          for (let i = 0; i < 8; i += 2) {
            points.push([homographyShape.points[i], homographyShape.points[i + 1]]);
          }
          setFieldPoints(points);
        } else {
          console.warn('No valid homography shape found. Draw a 4-point "homography" shape in video details.');
          setFieldPoints(null);
        }
      }

      const playerNames = new Set();
      boxesData.forEach(frameData => {
        if (frameData) {
          Object.keys(frameData).forEach(key => playerNames.add(key));
        }
      });

      const allSequences = {};
      playerNames.forEach(playerName => {
        const sequences = findPlayerSequences({ boxes: boxesData }, playerName);
        if (sequences.length > 0) {
          allSequences[playerName] = sequences;
        }
      });
      
      setPlayerSequences(allSequences);
      setSelectedPlayers(new Set()); // Reset selected players when video changes
      setBoundingBoxDimensions([metadata.width, metadata.height]);
    }
  }, [selectedVideo]);

  useEffect(() => {
    if (selectedPlayers.size > 0 && boxes.length > 0) {
      drawTrajectory();
    }
  }, [selectedPlayers, boxes]);

  useEffect(() => {
    if (selectedPlayers.size > 0 && boxes.length > 0) {
      const points = [];
      boxes.forEach((frameData, frameIndex) => {
        selectedPlayers.forEach(playerName => {
          if (frameData && frameData[playerName]) {
            const box = frameData[playerName].bbox;
            const x = box[0] + (box[2] / 2);
            const y = box[1] + (box[3] / 2);
            points.push({
              frame: frameIndex,
              x: Math.round(x),
              y: Math.round(y)
            });
          }
        });
      });
      setPlayerPoints(points);
    } else {
      setPlayerPoints([]);
    }
  }, [selectedPlayers, boxes]);

  const fetchVideos = async () => {
    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/videos/with-tags`);
      const data = await response.json();
      setVideos(data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const handleVideoSelect = (videoId) => {
    const video = videos.find(v => v.id === parseInt(videoId));
    setSelectedVideo(video);
    const videoMetadata = JSON.parse(video.metadata);
    setMetadata(videoMetadata);
  };

  const videoDurationInFrames = useMemo(() => {
    console.log('setting videoDurationInFrames', boxes.length);
    return boxes.length;
  }, [boxes]);

  const handlePlayerSelect = (playerName) => {
    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerName)) {
        newSet.delete(playerName);
      } else {
        newSet.add(playerName);
      }
      return newSet;
    });
  };

  const transformPoints = async (points) => {
    if (!fieldPoints) {
      console.error('No field points available for transformation');
      return;
    }

    try {
      points = points.map(p => [p[0] * x_scale, p[1] * y_scale]);
      const response = await fetch(`${globalData.APIbaseUrl}/api/homography/transform`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          points,
          fieldPoints 
        }),
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setTransformedPoints(data.transformed_points);
    } catch (error) {
      console.error('Error transforming points:', error);
    }
  };

  const drawTrajectory = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    
    // Draw field outline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // Draw center line and circle
    ctx.beginPath();
    ctx.moveTo(FIELD_WIDTH / 2, 0);
    ctx.lineTo(FIELD_WIDTH / 2, FIELD_HEIGHT);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, 50, 0, Math.PI * 2);
    ctx.stroke();

    // Only proceed if we have field points
    if (!fieldPoints) {
      ctx.fillStyle = '#ff0000';
      ctx.font = '16px Arial';
      ctx.fillText('No homography points found. Draw "homography" shape in video details.', 20, FIELD_HEIGHT / 2);
      ctx.font = '14px Arial';
      ctx.fillText('(4 points: top-left → top-right → bottom-right → bottom-left)', 20, FIELD_HEIGHT / 2 + 25);
      return;
    }

    // Collect points for the selected players
    const points = [];
    boxes.forEach((frameData, frameIndex) => {
      selectedPlayers.forEach(playerName => {
        if (frameData && frameData[playerName]) {
          const box = frameData[playerName].bbox;
          // Calculate center point of the box
          const x = box[0] + (box[2] / 2);
          const y = box[1] + (box[3] / 2);
          points.push([x, y]);
        }
      });
    });

    if (points.length > 0) {
      // Transform points using homography
      transformPoints(points);
    }
  };

  useEffect(() => {
    if (transformedPoints.length > 0) {
      console.log('drawing transformedPoints', transformedPoints);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Draw transformed trajectory
      ctx.beginPath();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;

      transformedPoints.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point[0], point[1]);
        } else {
          ctx.lineTo(point[0], point[1]);
        }

        // Draw point
        ctx.fillStyle = index === transformedPoints.length - 1 ? '#ff0000' : '#00ff00';
        ctx.beginPath();
        ctx.arc(point[0], point[1], POINT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.stroke();
    }
  }, [transformedPoints]);

  const handleTestTransform = async (e) => {
    e.preventDefault();
    if (!fieldPoints) {
      alert('No field points available. Draw homography shape first.');
      return;
    }

    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/homography/transform`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          points: [[testPoint.x, testPoint.y]],
          fieldPoints 
        }),
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setTestResult(data.transformed_points[0]);
      
      // Draw the test point and its transformation
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Draw original point location (in red)
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(testPoint.x, testPoint.y, POINT_RADIUS * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw transformed point (in blue)
      const [tx, ty] = data.transformed_points[0];
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(tx, ty, POINT_RADIUS * 2, 0, Math.PI * 2);
      ctx.fill();
      
    } catch (error) {
      console.error('Error testing point transform:', error);
    }
  };

  const renderVideoPlayer = () => {
    if (!selectedVideo || selectedPlayers.size === 0) return null;
    console.log('selectedVideo', { selectedVideo, metadata });

    const video = videos.find(v => v.id === selectedVideo.id);
    if (!video) return null;

    return (
      <div className="video-preview">
        <h3>Video Preview</h3>
        <Player
          component={VideoWithBoxes}
          inputProps={{
            videoSrc: video.filepath,
            boxes: boxes,
            selectedPlayers: Array.from(selectedPlayers),
            startFrame: 1,
            endFrame: videoDurationInFrames,
            xScale: x_scale_bbox,
            yScale: y_scale_bbox
          }}
          durationInFrames={videoDurationInFrames}
          compositionWidth={1280}
          compositionHeight={720}
          fps={29.97}
          controls
          style={{
            width: '100%',
            maxWidth: '800px',
            margin: '20px 0'
          }}
        />
      </div>
    );
  };

  return (
    <Layout>
      <div className="homography-container">
        <h1>Homography</h1>
        
        <div className="video-selection">
          <h2>Select a Video</h2>
          <select 
            onChange={(e) => handleVideoSelect(e.target.value)}
            value={selectedVideo?.id || ''}
          >
            <option value="">Choose a video...</option>
            {videos.map(video => (
              <option key={video.id} value={video.id}>
                {video.name}
              </option>
            ))}
          </select>
        </div>

        {selectedVideo && Object.keys(playerSequences).length > 0 && (
          <>
            <div className="player-selection">
              <h2>Select a Player</h2>
              <div className="player-buttons">
                {Object.keys(playerSequences).map(playerName => (
                  <button
                    key={playerName}
                    onClick={() => handlePlayerSelect(playerName)}
                    className={`player-button ${selectedPlayers.has(playerName) ? 'selected' : ''}`}
                  >
                    {playerName}
                  </button>
                ))}
              </div>
            </div>

            <div className="visualization-container">
              <canvas
                ref={canvasRef}
                width={FIELD_WIDTH}
                height={FIELD_HEIGHT}
                className="field-canvas"
              />
            </div>
            {renderVideoPlayer()}

            {selectedPlayers.size > 0 && (
              <div className="sequences-container">
                <h2>Selected Players' Sequences</h2>
                <table className="sequences-table">
                  <thead>
                    <tr>
                      <th>Start Frame</th>
                      <th>End Frame</th>
                      <th>Duration (frames)</th>
                      <th>Duration (seconds)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPlayers.size > 0 && Object.entries(playerSequences).map(([playerName, sequences]) => (
                      sequences.map((seq, index) => (
                        <tr key={`${playerName}-${index}`}>
                          <td>{seq.startFrame}</td>
                          <td>{seq.endFrame}</td>
                          <td>{seq.endFrame - seq.startFrame}</td>
                          <td>{((seq.endFrame - seq.startFrame) / 30).toFixed(2)}s</td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {selectedVideo && Object.keys(playerSequences).length === 0 && (
          <div className="no-sequences">
            No player tracking sequences found in this video
          </div>
        )}

        {selectedPlayers.size > 0 && playerPoints.length > 0 && (
          <div className="points-table-container">
            <h3>First 100 Points</h3>
            <table className="points-table">
              <thead>
                <tr>
                  <th>Frame</th>
                  <th>X</th>
                  <th>Y</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {playerPoints.map((point, index) => (
                  <tr key={index}>
                    <td>{point.frame}</td>
                    <td>{point.x}</td>
                    <td>{point.y}</td>
                    <td>
                      <button 
                        onClick={() => {
                          setTestPoint({ x: point.x, y: point.y });
                          handleTestTransform({ preventDefault: () => {} });
                        }}
                        className="use-point-button"
                      >
                        Test Point
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedVideo && (
          <div className="test-form-container">
            <h3>Test Point Transform</h3>
            <form onSubmit={handleTestTransform} className="test-form">
              <div className="input-group">
                <label>
                  X:
                  <input
                    type="number"
                    value={testPoint.x}
                    onChange={(e) => setTestPoint(prev => ({ ...prev, x: Number(e.target.value) }))}
                  />
                </label>
                <label>
                  Y:
                  <input
                    type="number"
                    value={testPoint.y}
                    onChange={(e) => setTestPoint(prev => ({ ...prev, y: Number(e.target.value) }))}
                  />
                </label>
              </div>
              <button type="submit">Transform Point</button>
            </form>
            {testResult && (
              <div className="test-result">
                <h4>Transformed Point:</h4>
                <p>
                  X: {testResult[0].toFixed(2)}, Y: {testResult[1].toFixed(2)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Homography; 