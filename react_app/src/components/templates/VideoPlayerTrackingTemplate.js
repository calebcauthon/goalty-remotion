import React, { useMemo, useEffect } from 'react';
import { AbsoluteFill, Video, Sequence, useCurrentFrame, staticFile } from 'remotion';

export const calculatePlayerTrackingDuration = (selectedTags) => {
  const tagArray = Array.from(selectedTags);
  return tagArray.reduce((total, tag) => {
    const clipDuration = parseInt(tag.endFrame, 10) - parseInt(tag.startFrame, 10);
    return total + clipDuration;
  }, 0);
};

export const VideoPlayerTrackingSettings = {
  playerNameColor: {
    type: 'color',
    label: 'Player Name Color',
    default: '#FF6B00'
  },
  parabolaColor: {
    type: 'color',
    label: 'Throw Line Color',
    default: '#0000FF'  // Default blue color
  },
  parabolaOpacity: {
    type: 'range',
    label: 'Throw Line Opacity',
    min: -0.1,
    max: 1,
    step: 0.1,
    default: 0.6
  },
  playerSettings: {
    type: 'playerGroup',
    label: 'Player Settings',
    perPlayer: {
      pathColor: {
        type: 'color',
        label: 'Path Color',
        default: '#FF0000'
      },
      pathOpacity: {
        type: 'range',
        label: 'Path Opacity',
        min: 0,
        max: 1,
        step: 0.1,
        default: 0.8
      },
      boxOpacity: {
        type: 'range',
        label: 'Box Opacity',
        min: 0,
        max: 1,
        step: 0.1,
        default: 1
      }
    }
  }
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
  height=1080,
  currentPlayingClipRef=null,
  settings={}
}) => {
  const tagArray = useMemo(() => Array.from(selectedTags), []);
  const frame = useCurrentFrame();

  const TRAIL_LENGTH = 1000; // Number of frames to show in trail
  const STRETCH_COUNT = 15; // Only draw every Nth circle
  const LINE_THICKNESS = 4; // Width of the tracking line
  const TRAIL_OPACITY = 0.8; // Opacity for trail lines
  const SMOOTHING_WEIGHT = 0.8; // 0 = no smoothing, 1 = maximum smoothing
  const RECEPTION_MARKER_SIZE = 2; // Diameter of the reception marker

  const THROW_HEIGHT_FACTOR = 0.3; // Controls how high the parabola goes
  const ARROW_SIZE = 15; // Size of the arrow head

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

  // Replace the hardcoded PLAYER_COLORS with this
  const generatePlayerColors = (players) => {
    const colors = [
      '#FF0000', // Red
      '#00FF00', // Green 
      '#0000FF', // Blue
      '#FFA500', // Orange
      '#800080', // Purple
      '#00FFFF', // Cyan
      '#FFD700', // Gold
      '#FF69B4', // Hot Pink
      '#4B0082', // Indigo
      '#32CD32'  // Lime Green
    ];

    const playerColors = {};
    players.forEach((player, index) => {
      playerColors[player] = colors[index % colors.length];
    });
    return playerColors;
  };

  // Get unique players from the metadata
  const getUniquePlayers = useMemo(() => {
    const players = new Set();
    selectedVideos.forEach(videoId => {
      const video = videos.find(v => v.id === videoId);
      const metadata = getVideoMetadata(video);
      if (metadata?.boxes) {
        metadata.boxes.forEach(box => {
          if (box) {
            Object.keys(box).forEach(player => players.add(player));
          }
        });
      }
    });
    return Array.from(players);
  }, [selectedVideos, videos, getVideoMetadata]);

  // Generate colors for all players
  const PLAYER_COLORS = useMemo(() => 
    generatePlayerColors(getUniquePlayers), 
    [getUniquePlayers]
  );

  // Update getPlayerColor to use ??
  const getPlayerColor = (player) => {
    const defaultColor = PLAYER_COLORS[player] ?? '#FF0000';
    return settings?.playerSettings?.[player]?.pathColor ?? defaultColor;
  };

  // Update getPlayerOpacity to handle numeric values properly
  const getPlayerOpacity = (player) => {
    const opacity = settings?.playerSettings?.[player]?.pathOpacity;
    return typeof opacity === 'number' ? opacity : TRAIL_OPACITY;
  };

  // Add a helper function to get box opacity
  const getPlayerBoxOpacity = (player) => {
    const opacity = settings?.playerSettings?.[player]?.boxOpacity;
    return typeof opacity === 'number' ? opacity : 1;
  };

  var shownMetadata = false;

  // Add memoized metadata parser
  

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

  const getTrailPositions = (video, currentClipFrame, currentPlayingClipRef) => {
    const playerPaths = {};
    const frameSet = new Set(); // Track which frames we've already processed
    
    // First pass: collect paths at STRETCH_COUNT intervals
    for (let i = currentPlayingClipRef.startFrame; i <= currentClipFrame; i += STRETCH_COUNT) {
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

    // Second pass: find all reception/throw frames and add their positions
    Object.keys(playerPaths).forEach(player => {
      for (let i = 0; i <= currentClipFrame; i++) {
        const tagsForFrame = getTagsForFrame(video, i);
        const isKeyFrame = tagsForFrame.some(tag => {
          const tagName = tag.name?.toLowerCase() || '';
          return tagName.includes(`${player.toLowerCase()} reception`) || 
                 tagName.includes(`${player.toLowerCase()} throw`);
        });

        if (isKeyFrame && !frameSet.has(i)) {
          const boxes = getBoxesForFrame(video, i);
          const playerBox = boxes.find(box => box.player === player);
          if (playerBox) {
            playerPaths[player].positions.push({
              frame: i,
              bbox: playerBox.bbox
            });
            frameSet.add(i);
          }
        }

        if (hasReceptionAtFrame(video, i, player)) {
          playerPaths[player].receptionFrames.push(i);
        }
      }
      // Sort positions by frame to maintain proper path order
      playerPaths[player].positions.sort((a, b) => a.frame - b.frame);
    });

    return playerPaths;
  };

  const smoothPath = (points) => {
    if (points.length < 2) return '';
    
    // Find continuous segments
    let segments = [];
    let currentSegment = [points[0]];
    
    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      const prev = points[i - 1];
      
      // Check if points are adjacent in the original data
      const [prevX, prevY] = prev.split(',').map(Number);
      const [currX, currY] = current.split(',').map(Number);
      const distance = Math.sqrt(Math.pow(currX - prevX, 2) + Math.pow(currY - prevY, 2));
      
      if (distance < 100) { // Adjust threshold as needed
        currentSegment.push(current);
      } else {
        segments.push(currentSegment);
        currentSegment = [current];
      }
    }
    segments.push(currentSegment);

    // Process each continuous segment
    return segments
      .filter(segment => segment.length > 1)
      .map(segment => {
        const [first, ...rest] = segment;
        let pathD = `M ${first}`;
        
        for (let i = 0; i < rest.length; i++) {
          const current = rest[i];
          const prev = i === 0 ? first : rest[i - 1];
          const next = rest[i + 1] || current;
          
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
      })
      .join(' ');
  };

  // Add new constants
  const RECEPTION_LINE_COLOR = '#0000FF';
  const RECEPTION_LINE_OPACITY = 0.6;
  const RECEPTION_LINE_WIDTH = 3;

  // Add this new function near the other preprocessing functions
  const getReceptionSequence = (video, currentClipFrame, currentPlayingClipRef) => {
    const receptionPoints = [];
    
    // Collect all reception points up to current frame
    for (let frame = currentPlayingClipRef.startFrame; frame <= currentClipFrame; frame++) {
      const boxes = getBoxesForFrame(video, frame);
      const tagsForFrame = getTagsForFrame(video, frame);
      
      boxes.forEach(box => {
        if (hasReceptionAtFrame(video, frame, box.player)) {
          receptionPoints.push({
            frame,
            player: box.player,
            bbox: box.bbox
          });
        }
      });
    }

    // Sort by frame
    receptionPoints.sort((a, b) => a.frame - b.frame);
    
    return receptionPoints;
  };

  const getPlayerPossessionFrames = (video, maxFrame) => {
    const possessionRanges = {};
    
    // Scan through frames to find receptions and throws
    for (let frame = 0; frame <= maxFrame; frame++) {
      const tagsForFrame = getTagsForFrame(video, frame);
      
      // Sort tags by frame first
      tagsForFrame.sort((a, b) => (a.frame || 0) - (b.frame || 0));
      tagsForFrame.forEach(tag => {
        const tagName = tag.name?.toLowerCase() || '';
        const playerMatch = tagName.match(/(\w+)\s+(reception|throw)/);
        
        if (playerMatch) {
          const [_, player, action] = playerMatch;
          if (!possessionRanges[player]) {
            possessionRanges[player] = [];
          }

          if (action === 'reception') {
            possessionRanges[player].push({ start: frame });
          } else if (action === 'throw') {
            // Find the last incomplete range and complete it
            const lastRange = possessionRanges[player][possessionRanges[player].length - 1];
            if (lastRange && !lastRange.end) {
              lastRange.end = frame;
            }
          }
        }
      });
    }

    return possessionRanges;
  };

  // Update getActiveThrow to also find the next reception
  const getActiveThrow = (video, currentFrame) => {
    const tagsUpToFrame = [];
    
    // Look ahead an extra 60 frames to find next reception
    for (let frame = 0; frame <= currentFrame + 60; frame++) {
      const tagsForFrame = getTagsForFrame(video, frame);
      tagsForFrame.forEach(tag => {
        if (tag.name?.toLowerCase().includes('reception') || 
            tag.name?.toLowerCase().includes('throw')) {
          tagsUpToFrame.push({ ...tag, frame });
        }
      });
    }
    
    tagsUpToFrame.sort((a, b) => a.frame - b.frame);
    
    let activeThrow = null;
    let nextReception = null;

    for (let i = tagsUpToFrame.length - 1; i >= 0; i--) {
      const tag = tagsUpToFrame[i];
      const tagName = tag.name?.toLowerCase() || '';
      
      if (tag.frame <= currentFrame) {
        if (tagName.includes('throw')) {
          const playerMatch = tagName.match(/(\w+)\s+throw/);
          if (playerMatch) {
            const boxes = getBoxesForFrame(video, tag.frame);
            const throwerBox = boxes.find(box => box.player === playerMatch[1]);
            if (throwerBox) {
              activeThrow = {
                startFrame: tag.frame,
                thrower: playerMatch[1],
                bbox: throwerBox.bbox
              };
              // Look ahead for next reception after this throw
              for (let j = i + 1; j < tagsUpToFrame.length; j++) {
                const nextTag = tagsUpToFrame[j];
                if (nextTag.name?.toLowerCase().includes('reception')) {
                  const boxes = getBoxesForFrame(video, nextTag.frame);
                  const receiverBox = boxes.find(box => 
                    nextTag.name?.toLowerCase().includes(box.player.toLowerCase())
                  );
                  if (receiverBox) {
                    nextReception = {
                      frame: nextTag.frame,
                      bbox: receiverBox.bbox
                    };
                    break;
                  }
                }
              }
              break;
            }
          }
        }
        break;
      }
    }
    
    return activeThrow ? { ...activeThrow, nextReception } : null;
  };

  // Add this function near the other preprocessing functions
  const getPlaySequence = (video, clipStartFrame, clipEndFrame) => {
    let finalThrower = null;
    let finalCatcher = null;
    
    // Collect all relevant tags first
    const allTags = [];
    for (let frame = clipStartFrame; frame <= clipEndFrame; frame++) {
      const tags = getTagsForFrame(video, frame);
      tags.forEach(tag => {
        allTags.push({ ...tag, frame });
      });
    }

    // Sort by frame number
    allTags.sort((a, b) => a.frame - b.frame);
    
    // Process in chronological order to find last throw and catch
    allTags.forEach(tag => {
      const tagName = tag.name?.toLowerCase() || '';
      const throwMatch = tagName.match(/(\w+)\s+throw/);
      const catchMatch = tagName.match(/(\w+)\s+reception/);
      
      if (throwMatch) {
        finalThrower = throwMatch[1];
      }
      if (catchMatch) {
        finalCatcher = catchMatch[1];
      }
    });

    return { finalThrower, finalCatcher };
  };

  // Add this new function near other preprocessing functions
  const getPlayerTouches = (video, startFrame, endFrame) => {
    const touches = {};
    
    for (let frame = startFrame; frame <= endFrame; frame++) {
      const tags = getTagsForFrame(video, frame);
      tags.forEach(tag => {
        const tagName = tag.name?.toLowerCase() || '';
        const receptionMatch = tagName.match(/(\w+)\s+reception/);
        
        if (receptionMatch) {
          const player = receptionMatch[1];
          touches[player] = (touches[player] || 0) + 1;
        }
      });
    }

    // Sort by number of touches descending
    return Object.entries(touches)
      .sort(([,a], [,b]) => b - a)
      .reduce((acc, [player, count]) => ({
        ...acc,
        [player]: count
      }), {});
  };

  // Add this new function near other preprocessing functions
  const getPlayerPossessionTimes = (video, startFrame, endFrame) => {
    const possessionTimes = {};
    
    // First pass - collect all possession ranges
    const ranges = {};
    for (let frame = startFrame; frame <= endFrame; frame++) {
      const tags = getTagsForFrame(video, frame);
      tags.forEach(tag => {
        const tagName = tag.name?.toLowerCase() || '';
        const receptionMatch = tagName.match(/(\w+)\s+reception/);
        const throwMatch = tagName.match(/(\w+)\s+throw/);
        
        if (receptionMatch) {
          const player = receptionMatch[1];
          if (!ranges[player]) ranges[player] = [];
          ranges[player].push({ start: frame });
        }
        
        if (throwMatch) {
          const player = throwMatch[1];
          if (ranges[player]?.length) {
            const lastRange = ranges[player][ranges[player].length - 1];
            if (!lastRange.end) lastRange.end = frame;
          }
        }
      });
    }

    // Calculate total possession time for each player
    Object.entries(ranges).forEach(([player, playerRanges]) => {
      const totalFrames = playerRanges.reduce((total, range) => {
        // If no throw was found, use the clip end
        const end = range.end || endFrame;
        return total + (end - range.start);
      }, 0);
      
      possessionTimes[player] = (totalFrames / 30).toFixed(1); // Convert to seconds
    });

    return possessionTimes;
  };

  //console.log('width and height', { width, height });
  React.useEffect(() => {
    onFrameUpdate(frame);
  }, [frame, onFrameUpdate]);

  useEffect(() => {
    if (currentPlayingClipRef) {
      console.log('Current playing clip in template:', currentPlayingClipRef);
    }
  }, [currentPlayingClipRef]);

  return (
    <AbsoluteFill>
      {tagArray.map((tagInfo, index) => {
        const video = videos.find(v => v.id === tagInfo.videoId);
        if (!video) return null;
        if (!video.filepath) return null;

        // Check if this sequence matches the current playing clip
        const isCurrentClip = currentPlayingClipRef && 
          currentPlayingClipRef.videoId === tagInfo.videoId &&
          currentPlayingClipRef.startFrame === parseInt(tagInfo.startFrame, 10) &&
          currentPlayingClipRef.endFrame === parseInt(tagInfo.endFrame, 10);

        const previousClipsDuration = tagArray
          .slice(0, index)
          .reduce((total, tag) => {
            return total + (parseInt(tag.endFrame, 10) - parseInt(tag.startFrame, 10));
          }, 0);

        const clipDuration = parseInt(tagInfo.endFrame, 10) - parseInt(tagInfo.startFrame, 10);
        const currentClipFrame = frame - previousClipsDuration + parseInt(tagInfo.startFrame, 10);
        
        // Only get tracking data if this is the current clip
        const boxes = isCurrentClip ? getBoxesForFrame(video, currentClipFrame) : [];
        const tagsForFrame = isCurrentClip ? getTagsForFrame(video, currentClipFrame) : [];
        const receptionSequence = isCurrentClip ? getReceptionSequence(video, currentClipFrame, currentPlayingClipRef) : [];

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

        const POSSESSION_LINE_THICKNESS = LINE_THICKNESS * 1.5;
        const POSSESSION_OPACITY = TRAIL_OPACITY * 1.2;

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
                
                {/* Only render tracking overlays if this is the current clip */}
                {isCurrentClip && (
                  <>
                    {/* Bounding Boxes */}
                    {boxes.map((box, i) => {
                      const scaledBox = scaleBox(box, originalSize, containerSize);
                      const hasReception = hasReceptionAtFrame(video, currentClipFrame, box.player);
                      const boxOpacity = getPlayerBoxOpacity(box.player);
                      
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
                            pointerEvents: 'none',
                            opacity: boxOpacity
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
                            boxShadow: hasReception ? '0 0 10px rgba(255, 255, 0, 0.5)' : 'none',
                            opacity: boxOpacity
                          }} />
                          <div style={{
                            position: 'absolute',
                            left: `${scaledBox.x}px`,
                            top: `${scaledBox.y - 25}px`,
                            background: '#FF6B00',
                            color: settings.playerNameColor ?? VideoPlayerTrackingSettings.playerNameColor.default,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            opacity: boxOpacity
                          }}>
                            {box.player}
                            {hasReception ? ' 🏈' : ''}
                          </div>
                        </div>
                      );
                    })}

                    {/* Render trail points */}
                    {Object.entries(getTrailPositions(video, currentClipFrame, currentPlayingClipRef)).map(([player, data]) => {
                      const pathPoints = data.positions.map(pos => {
                        const scaledPos = scaleBox({ bbox: pos.bbox }, originalSize, containerSize);
                        return `${scaledPos.x + scaledPos.width/2},${scaledPos.y + scaledPos.height}`;
                      });

                      const possessionRanges = getPlayerPossessionFrames(video, currentClipFrame);
                      const playerPossessions = possessionRanges[player] || [];

                      // Split path into segments based on possession
                      const segments = pathPoints.map((point, idx) => {
                        const frame = data.positions[idx].frame;
                        const hasPossession = playerPossessions.some(range => 
                          range.start <= frame && (!range.end || frame <= range.end)
                          && frame >= currentPlayingClipRef.startFrame && frame <= currentPlayingClipRef.endFrame
                        );
                        return { point, hasPossession };
                      });

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
                            {/* Regular path */}
                            <path
                              d={smoothPath(segments.filter(s => !s.hasPossession).map(s => s.point))}
                              stroke={getPlayerColor(player)}
                              strokeWidth={LINE_THICKNESS}
                              fill="none"
                              opacity={getPlayerOpacity(player)}
                            />
                            {/* Possession path */}
                            <path
                              d={smoothPath(segments.filter(s => s.hasPossession).map(s => s.point))}
                              stroke={"white"}
                              strokeWidth={POSSESSION_LINE_THICKNESS}
                              fill="none"
                              opacity={getPlayerOpacity(player) * 1.2}
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

                    {/* Add reception connection lines */}
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
                      {/* Add defs for the arrow marker */}
                      <defs>
                        <marker
                          id="arrowhead"
                          markerWidth="10"
                          markerHeight="7"
                          refX="9"
                          refY="3.5"
                          orient="auto"
                        >
                          <polygon 
                            points="0 0, 10 3.5, 0 7" 
                            fill={settings.parabolaColor ?? VideoPlayerTrackingSettings.parabolaColor.default}
                            opacity={settings.parabolaOpacity ?? VideoPlayerTrackingSettings.parabolaOpacity.default}
                          />
                        </marker>
                      </defs>
                      
                      {/* Completed throws */}
                      {receptionSequence.slice(0, -1).map((reception, i) => {
                        const current = scaleBox({ bbox: reception.bbox }, originalSize, containerSize);
                        const next = scaleBox({ bbox: receptionSequence[i + 1].bbox }, originalSize, containerSize);
                        
                        // Calculate control point for the parabola
                        const midX = (current.x + next.x + current.width/2 + next.width/2) / 2;
                        const midY = Math.min(current.y, next.y) - 
                          Math.abs(next.x - current.x) * THROW_HEIGHT_FACTOR - 
                          Math.abs(next.y - current.y) * THROW_HEIGHT_FACTOR;
                        
                        return (
                          <path
                            key={`reception-line-${i}`}
                            d={`M ${current.x + current.width/2} ${current.y + current.height}
                               Q ${midX} ${midY} 
                               ${next.x + next.width/2} ${next.y + next.height}`}
                            stroke={settings.parabolaColor ?? VideoPlayerTrackingSettings.parabolaColor.default}
                            strokeWidth={RECEPTION_LINE_WIDTH}
                            opacity={settings.parabolaOpacity ?? VideoPlayerTrackingSettings.parabolaOpacity.default}
                            fill="none"
                            markerEnd="url(#arrowhead)"
                          />
                        );
                      })}

                      {/* Active throw */}
                      {(() => {
                        const activeThrow = getActiveThrow(video, currentClipFrame);
                        if (!activeThrow) return null;

                        const start = scaleBox({ bbox: activeThrow.bbox }, originalSize, containerSize);
                        
                        // Use next reception position if available, otherwise estimate
                        let endX, endY;
                        if (activeThrow.nextReception) {
                          const end = scaleBox({ bbox: activeThrow.nextReception.bbox }, originalSize, containerSize);
                          endX = end.x + end.width/2;
                          endY = end.y + end.height;
                        } else {
                          endX = start.x + 300;
                          endY = start.y + start.height;
                        }
                        
                        // Calculate control point for the parabola
                        const midX = (start.x + endX) / 2;
                        const midY = Math.min(start.y + start.height, endY) - 
                          Math.abs(endX - (start.x + start.width/2)) * THROW_HEIGHT_FACTOR - 
                          Math.abs(endY - (start.y + start.height)) * THROW_HEIGHT_FACTOR;
                        
                        // Calculate how much of the path to show based on frame progress
                        const throwDuration = activeThrow.nextReception ? 
                          (activeThrow.nextReception.frame - activeThrow.startFrame) : 30;
                        const frameProgress = (currentClipFrame - activeThrow.startFrame) / throwDuration;
                        const progress = Math.min(frameProgress, 1);
                        
                        // Generate points along the full parabola
                        const numPoints = 100;
                        const points = [];
                        for (let i = 0; i <= numPoints * progress; i++) {
                          const t = i / numPoints;
                          const x = (1-t)*(1-t)*(start.x + start.width/2) + 
                                    2*(1-t)*t*midX + 
                                    t*t*endX;
                          const y = (1-t)*(1-t)*(start.y + start.height) + 
                                    2*(1-t)*t*midY + 
                                    t*t*endY;
                          points.push(`${x} ${y}`);
                        }
                        
                        return (
                          <path
                            key="active-throw"
                            d={`M ${points.join(' L ')}`}
                            stroke={settings.parabolaColor ?? VideoPlayerTrackingSettings.parabolaColor.default}
                            strokeWidth={RECEPTION_LINE_WIDTH}
                            opacity={settings.parabolaOpacity ?? VideoPlayerTrackingSettings.parabolaOpacity.default}
                            fill="none"
                            markerEnd="url(#arrowhead)"
                            strokeDasharray="4 4"
                          />
                        );
                      })()}
                    </svg>

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
                      fontWeight: 'bold',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end'
                    }}>
                      <div>Summary</div>
                      {(() => {
                        const { finalThrower, finalCatcher } = getPlaySequence(
                          video, 
                          parseInt(tagInfo.startFrame, 10),
                          parseInt(tagInfo.endFrame, 10)
                        );

                        const touches = getPlayerTouches(
                          video,
                          parseInt(tagInfo.startFrame, 10),
                          parseInt(tagInfo.endFrame, 10)
                        );

                        const clipDuration = ((parseInt(tagInfo.endFrame, 10) - parseInt(tagInfo.startFrame, 10)) / 30).toFixed(1);

                        return (
                          <>
                            <div style={{ fontSize: '16px', marginTop: '4px' }}>
                              Duration: {clipDuration}s
                            </div>
                            {finalThrower && finalCatcher && (
                              <div style={{ fontSize: '16px', marginTop: '4px' }}>
                                {finalThrower} ➜ {finalCatcher}
                              </div>
                            )}
                            <div style={{ 
                              fontSize: '14px', 
                              marginTop: '8px',
                              borderTop: '1px solid rgba(255,255,255,0.3)',
                              paddingTop: '4px'
                            }}>
                              {Object.entries(touches).map(([player, count]) => {
                                const possessionTime = getPlayerPossessionTimes(
                                  video,
                                  parseInt(tagInfo.startFrame, 10),
                                  parseInt(tagInfo.endFrame, 10)
                                )[player];
                                
                                return (
                                  <div key={player}>
                                    {player}: {count} {count === 1 ? 'touch' : 'touches'}
                                    {possessionTime && ` (${possessionTime}s)`}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}; 