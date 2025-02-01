import React, { useMemo, useEffect } from 'react';
import { AbsoluteFill, Video, Sequence, useCurrentFrame, staticFile } from 'remotion';

export const calculatePlayerTrackingDuration = (selectedTags) => {
  const tagArray = Array.from(selectedTags);
  return tagArray.reduce((total, tag) => {
    const clipDuration = parseInt(tag.endFrame, 10) - parseInt(tag.startFrame, 10);
    return total + clipDuration;
  }, 0);
};

export const VideoPlayerTrackingTemplate = ({ 
  selectedVideos, 
  videos, 
  selectedTags, 
  useStaticFile,
  onFrameUpdate=() => {},
  detections=[],
  frameImage=null,
  hoveredDetectionIndex,
  width=1920,
  height=1080
}) => {
  const tagArray = useMemo(() => Array.from(selectedTags), []);
  const frame = useCurrentFrame();

  const TRAIL_LENGTH = 1000; // Number of frames to show in trail
  const STRETCH_COUNT = 15; // Only draw every Nth circle
  const LINE_THICKNESS = 4; // Width of the tracking line
  const TRAIL_OPACITY = 0.8; // Opacity for trail lines
  const SMOOTHING_WEIGHT = 0.8; // 0 = no smoothing, 1 = maximum smoothing
  const RECEPTION_MARKER_SIZE = 16; // Diameter of the reception marker

  // Color palette for different players
  const PLAYER_COLORS = {
    'christian': '#FF0000', // Red
    'Player 2': '#00FF00', // Green
    'Player 3': '#0000FF', // Blue
    'Player 4': '#FFA500', // Orange
    'Player 5': '#800080', // Purple
    'aaron': '#00FFFF', // Cyan
    'default': '#FF0000'   // Fallback color
  };

  // Helper to get color for a player
  const getPlayerColor = (player) => {
    return PLAYER_COLORS[player] || PLAYER_COLORS.default;
  };

  const parseJsonIfNecessary = (data) => {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        return data;
      }
    }
    return data;
  }

  var shownMetadata = false;

  // Add memoized metadata parser
  const getVideoMetadata = useMemo(() => {
    const cache = new Map();
    
    return (video) => {
      if (!video?.metadata) return null;
      if (cache.has(video.id)) return cache.get(video.id);
      
      const metadata = parseJsonIfNecessary(video.metadata);
      cache.set(video.id, metadata);
      console.log('🔍 Metadata for video', { id: video.id, metadata });
      return metadata;
    };
  }, []);

  // Update getTagsForFrame to use memoized metadata
  const getTagsForFrame = (video, frame) => {
    const metadata = getVideoMetadata(video);
    if (!metadata) return [];
    return metadata.tags?.filter(tag => tag.frame === frame) || [];
  };

  // Update getBoxesForFrame to use memoized metadata
  const getBoxesForFrame = (video, frame) => {
    const metadata = getVideoMetadata(video);
    if (!metadata) return [];
    
    try {
      if (!metadata.boxes) return [];

      frame = Math.round(frame * (29.97 / 30));

      const targetFrameData = metadata.boxes.find(box => {
        if (!box) return false;
        const players = Object.keys(box);
        return players.some(player => box[player].frame === frame);
      });

      if (!targetFrameData) return [];

      return Object.entries(targetFrameData).map(([player, data]) => ({
        player,
        bbox: data.bbox
      }));

    } catch (error) {
      console.error('💥 Error parsing boxes metadata:', error);
      return [];
    }
  };

  const scaleBox = (box, originalSize, containerSize) => {
    const scaleX = containerSize.width / originalSize.width;
    const scaleY = containerSize.height / originalSize.height;

    return {
      x: box.bbox[0] * scaleX,
      y: box.bbox[1] * scaleY,
      width: box.bbox[2] * scaleX,
      height: box.bbox[3] * scaleY
    };
  };

  const hasReceptionAtFrame = (video, frame, player) => {
    const tagsForFrame = getTagsForFrame(video, frame);
    return tagsForFrame.some(tag => 
      tag.name?.toLowerCase().includes(`${player.toLowerCase()} reception`)
    );
  };

  const getTrailPositions = (video, currentClipFrame) => {
    const playerPaths = {};
    const frameSet = new Set(); // Track which frames we've already processed
    
    // First pass: collect paths at STRETCH_COUNT intervals
    for (let i = 0; i <= currentClipFrame; i += STRETCH_COUNT) {
      const boxes = getBoxesForFrame(video, i);
      boxes.forEach(box => {
        if (!playerPaths[box.player]) {
          playerPaths[box.player] = {
            positions: [],
            receptionFrames: []
          };
        }
        playerPaths[box.player].positions.push({
          frame: i,
          bbox: box.bbox
        });
        frameSet.add(i);
      });
    }

    // Second pass: find all reception frames and add their positions
    Object.keys(playerPaths).forEach(player => {
      for (let i = 0; i <= currentClipFrame; i++) {
        if (hasReceptionAtFrame(video, i, player)) {
          playerPaths[player].receptionFrames.push(i);
          
          // If we haven't already included this frame's position, add it
          if (!frameSet.has(i)) {
            const boxes = getBoxesForFrame(video, i);
            const playerBox = boxes.find(box => box.player === player);
            if (playerBox) {
              playerPaths[player].positions.push({
                frame: i,
                bbox: playerBox.bbox
              });
            }
          }
        }
      }
      // Sort positions by frame to maintain proper path order
      playerPaths[player].positions.sort((a, b) => a.frame - b.frame);
    });

    return playerPaths;
  };

  const smoothPath = (points) => {
    if (points.length < 2) return '';
    
    const [first, ...rest] = points;
    let pathD = `M ${first}`;
    
    for (let i = 0; i < rest.length; i++) {
      const current = rest[i];
      const prev = i === 0 ? first : rest[i - 1];
      const next = rest[i + 1] || current;
      
      // Calculate control points
      const [x, y] = current.split(',').map(Number);
      const [prevX, prevY] = prev.split(',').map(Number);
      const [nextX, nextY] = next.split(',').map(Number);
      
      const cp1x = prevX + (x - prevX) * (1 - SMOOTHING_WEIGHT);
      const cp1y = prevY + (y - prevY) * (1 - SMOOTHING_WEIGHT);
      const cp2x = x - (nextX - x) * SMOOTHING_WEIGHT;
      const cp2y = y - (nextY - y) * SMOOTHING_WEIGHT;
      
      pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${y}`;
    }
    
    return pathD;
  };

  //console.log('width and height', { width, height });
  React.useEffect(() => {
    onFrameUpdate(frame);
  }, [frame, onFrameUpdate]);

  return (
    <AbsoluteFill>
      {tagArray.map((tagInfo, index) => {
        const video = videos.find(v => v.id === tagInfo.videoId);
        if (!video) return null;
        if (!video.filepath) return null;

        const previousClipsDuration = tagArray
          .slice(0, index)
          .reduce((total, tag) => {
            return total + (parseInt(tag.endFrame, 10) - parseInt(tag.startFrame, 10));
          }, 0);

        const clipDuration = parseInt(tagInfo.endFrame, 10) - parseInt(tagInfo.startFrame, 10);
        const currentClipFrame = frame - previousClipsDuration + parseInt(tagInfo.startFrame, 10);
        
        // Get boxes for the current frame
        const boxes = getBoxesForFrame(video, currentClipFrame);
        const tagsForFrame = getTagsForFrame(video, currentClipFrame);
        
        // Get original video dimensions from metadata
        let originalSize = { width: 1920, height: 1080 }; // Default fallback
        try {
          const metadata = getVideoMetadata(video);
          originalSize = {
            width: metadata.width || 1920,
            height: metadata.height || 1080
          };
          //console.log('📏 Original video dimensions', originalSize);
        } catch (error) {
          console.warn('⚠️ Could not parse video metadata, using default dimensions');
        }

        // Container size (Remotion composition size)
        const containerSize = { width, height };

        const VIDEO_BASE_URL = useStaticFile 
          ? staticFile(`${video.filepath.split('/').pop()}`) 
          : video.filepath;

        return (
          <Sequence
            key={tagInfo.key}
            from={previousClipsDuration}
            durationInFrames={clipDuration}
          >
            <AbsoluteFill>
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backgroundColor: index % 2 === 0 ? 'rgba(0, 123, 255, 0.1)' : 'rgba(255, 193, 7, 0.1)'
              }}>
                {frameImage ? (
                  <img
                    src={`data:image/jpeg;base64,${frameImage}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                ) : null}
                <Video
                  src={VIDEO_BASE_URL}
                  startFrom={parseInt(tagInfo.startFrame, 10)}
                  endAt={parseInt(tagInfo.endFrame, 10)}
                  style={{
                    width: '100%',
                    height: '100%'
                  }}
                />
                
                {/* Bounding Boxes */}
                {boxes.map((box, i) => {
                  const scaledBox = scaleBox(box, originalSize, containerSize);
                  const hasReception = hasReceptionAtFrame(video, currentClipFrame, box.player);
                  
                  return (
                    <div key={i}>
                      <div style={{
                        position: 'absolute',
                        left: `${scaledBox.x}px`,
                        top: `${scaledBox.y}px`,
                        width: `${scaledBox.width}px`,
                        height: `${scaledBox.height}px`,
                        border: '2px solid #FF6B00',
                        boxSizing: 'border-box',
                        pointerEvents: 'none'
                      }} />
                      {/* Position marker circle */}
                      <div style={{
                        position: 'absolute',
                        left: `${scaledBox.x + scaledBox.width/2 - 4}px`,
                        top: `${scaledBox.y + scaledBox.height - 4}px`,
                        width: '8px',
                        height: '8px',
                        background: hasReception ? '#FFFF00' : 'red',
                        borderRadius: '50%',
                        pointerEvents: 'none',
                        transform: hasReception ? `scale(2)` : 'none',
                        boxShadow: hasReception ? '0 0 10px rgba(255, 255, 0, 0.5)' : 'none'
                      }} />
                      <div style={{
                        position: 'absolute',
                        left: `${scaledBox.x}px`,
                        top: `${scaledBox.y - 25}px`,
                        background: '#FF6B00',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                      }}>
                        {box.player}
                        {hasReception ? ' 🏈' : ''}
                      </div>
                    </div>
                  );
                })}

                {/* Render trail points */}
                {Object.entries(getTrailPositions(video, currentClipFrame)).map(([player, data]) => {
                  const pathPoints = data.positions.map(pos => {
                    const scaledPos = scaleBox({ bbox: pos.bbox }, originalSize, containerSize);
                    return `${scaledPos.x + scaledPos.width/2},${scaledPos.y + scaledPos.height}`;
                  }).join(' L ');

                  return pathPoints.length > 0 ? (
                    <React.Fragment key={`trail-${player}`}>
                      <svg
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: '100%',
                          height: '100%',
                          pointerEvents: 'none'
                        }}
                      >
                        <path
                          d={smoothPath(pathPoints.split(' L '))}
                          stroke={getPlayerColor(player)}
                          strokeWidth={LINE_THICKNESS}
                          fill="none"
                          opacity={TRAIL_OPACITY}
                        />
                      </svg>
                      {data.positions.filter(pos => 
                        data.receptionFrames.includes(pos.frame)
                      ).map((pos, i) => {
                        const scaledPos = scaleBox({ bbox: pos.bbox }, originalSize, containerSize);
                        return (
                          <div
                            key={`reception-${player}-${pos.frame}`}
                            style={{
                              position: 'absolute',
                              left: `${scaledPos.x + scaledPos.width/2 - RECEPTION_MARKER_SIZE/2}px`,
                              top: `${scaledPos.y + scaledPos.height - RECEPTION_MARKER_SIZE/2}px`,
                              width: `${RECEPTION_MARKER_SIZE}px`,
                              height: `${RECEPTION_MARKER_SIZE}px`,
                              background: '#FFFF00',
                              borderRadius: '50%',
                              pointerEvents: 'none',
                              boxShadow: '0 0 10px rgba(255, 255, 0, 0.5)',
                              opacity: 0.8
                            }}
                          />
                        );
                      })}
                    </React.Fragment>
                  ) : null;
                })}

                {/* Player Tracking Text */}
                <div style={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}>
                  Player Tracking
                </div>
              </div>
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}; 