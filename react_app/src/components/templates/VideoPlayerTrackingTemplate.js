import React, { useMemo, useEffect, useState } from 'react';
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
      hidden: {
        type: 'checkbox',
        label: 'Hide Player',
        default: false
      },
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
  },
  stretchCount: {
    type: 'range',
    label: 'Trail Detail',
    min: 1,
    max: 100,
    step: 1,
    default: 15
  }
};

// Add this helper function near the top of the file
const getCurrentClipFromFrame = (frame, selectedTags) => {
  const tagArray = Array.from(selectedTags);
  let accumulatedFrames = 0;

  for (const tag of tagArray) {
    const clipDuration = parseInt(tag.endFrame, 10) - parseInt(tag.startFrame, 10);
    if (frame >= accumulatedFrames && frame < accumulatedFrames + clipDuration) {
      return {
        videoId: tag.videoId,
        videoName: tag.videoName,
        videoFilepath: tag.videoFilepath,
        tagName: tag.tagName,
        frame: tag.frame,
        startFrame: parseInt(tag.startFrame, 10),
        endFrame: parseInt(tag.endFrame, 10),
        key: tag.key
      };
    }
    accumulatedFrames += clipDuration;
  }
  
  // If we're at the end, return the last clip
  if (tagArray.length > 0 && frame >= accumulatedFrames) {
    const lastTag = tagArray[tagArray.length - 1];
    return {
      videoId: lastTag.videoId,
      videoName: lastTag.videoName,
      videoFilepath: lastTag.videoFilepath,
      tagName: lastTag.tagName,
      frame: lastTag.frame,
      startFrame: parseInt(lastTag.startFrame, 10),
      endFrame: parseInt(lastTag.endFrame, 10),
      key: lastTag.key
    };
  }

  return null;
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
  settings={}
}) => {
  const tagArray = useMemo(() => Array.from(selectedTags), []);
  const frame = useCurrentFrame();
  // Use provided currentPlayingClipRef or determine it from frame
  const effectiveCurrentClipRef = getCurrentClipFromFrame(frame, selectedTags);

  const TRAIL_LENGTH = 1000; // Number of frames to show in trail
  const STRETCH_COUNT = 15; // Only draw every Nth circle
  const LINE_THICKNESS = 4; // Width of the tracking line
  const TRAIL_OPACITY = 0.8; // Opacity for trail lines
  const SMOOTHING_WEIGHT = .8; // 0 = no smoothing, 1 = maximum smoothing
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

  const [currentSettings, setCurrentSettings] = useState(null);

  useEffect(() => {
    if (effectiveCurrentClipRef) {
      setCurrentSettings(settings[effectiveCurrentClipRef.key] || {});
    } else {
      setCurrentSettings({});
    }
  }, [effectiveCurrentClipRef, settings]);

  // Update getPlayerColor to use ??
  const getPlayerColor = (player) => {
    if (!currentSettings) return PLAYER_COLORS[player] ?? '#FF0000';
    
    const clipSettings = currentSettings.playerSettings?.[player];
    const defaultColor = PLAYER_COLORS[player] ?? '#FF0000';
    return clipSettings?.pathColor ?? defaultColor;
  };

  // Update getPlayerOpacity to handle numeric values properly
  const getPlayerOpacity = (player) => {
    if (!currentSettings) return TRAIL_OPACITY;

    const clipSettings = currentSettings.playerSettings?.[player];
    if (clipSettings?.hidden) return 0;
    
    const opacity = clipSettings?.pathOpacity;
    return typeof opacity === 'number' ? opacity : TRAIL_OPACITY;
  };

  // Add a helper function to get box opacity
  const getPlayerBoxOpacity = (player) => {
    if (!currentSettings) return 1;

    const clipSettings = currentSettings.playerSettings?.[player];
    if (clipSettings?.hidden) return 0;
    
    const opacity = clipSettings?.boxOpacity;
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
      tag.name?.toLowerCase().includes(`${player.toLowerCase()} catch`)
    );
  };

  // Replace the hardcoded STRETCH_COUNT with a function
  const getStretchCount = () => {
    if (!currentSettings) return VideoPlayerTrackingSettings.stretchCount.default;
    return currentSettings.stretchCount ?? VideoPlayerTrackingSettings.stretchCount.default;
  };

  // Update getTrailPositions to use the dynamic stretch count
  const getTrailPositions = (video, currentClipFrame, currentPlayingClipRef) => {
    const playerPaths = {};
    const frameSet = new Set();
    const stretchCount = getStretchCount();
    
    // Helper to add frame data to paths
    const addFrameData = (frame) => {
      const boxes = getBoxesForFrame(video, frame);
      boxes.forEach(box => {
        if (!playerPaths[box.player]) {
          playerPaths[box.player] = {
            positions: [],
            receptionFrames: []
          };
        }
        playerPaths[box.player].positions.push({
          frame,
          bbox: box.bbox
        });
        frameSet.add(frame);
      });
    };

    // Always add first frame
    addFrameData(currentPlayingClipRef.startFrame);
    
    // Collect paths at stretchCount intervals
    for (let i = currentPlayingClipRef.startFrame + stretchCount; i <= currentClipFrame; i += stretchCount) {
      addFrameData(i);
    }

    // Always add current frame if not already added
    if (!frameSet.has(currentClipFrame)) {
      addFrameData(currentClipFrame);
    }

    // Rest of the function remains the same...
    Object.keys(playerPaths).forEach(player => {
      for (let i = currentPlayingClipRef.startFrame; i <= currentClipFrame; i++) {
        const tagsForFrame = getTagsForFrame(video, i);
        const isKeyFrame = tagsForFrame.some(tag => {
          const tagName = tag.name?.toLowerCase() || '';
          return tagName.includes(`${player.toLowerCase()} catch`) || 
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
      playerPaths[player].positions.sort((a, b) => a.frame - b.frame);
    });

    return playerPaths;
  };

  const smoothPath = (points) => {
    if (points.length < 2) return '';
    
    // Find continuous segments with a more generous distance threshold
    let segments = [];
    let currentSegment = [points[0]];
    
    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      const prev = points[i - 1];
      
      const [prevX, prevY] = prev.split(',').map(Number);
      const [currX, currY] = current.split(',').map(Number);
      const distance = Math.sqrt(Math.pow(currX - prevX, 2) + Math.pow(currY - prevY, 2));
      
      // Increase threshold and use relative to screen size
      const threshold = Math.max(width, height) * 0.2; // 20% of screen size
      
      if (distance < threshold) {
        currentSegment.push(current);
      } else {
        // Instead of creating a new segment, add interpolated points
        const steps = Math.ceil(distance / threshold);
        for (let step = 1; step < steps; step++) {
          const t = step / steps;
          const interpX = prevX + (currX - prevX) * t;
          const interpY = prevY + (currY - prevY) * t;
          currentSegment.push(`${interpX},${interpY}`);
        }
        currentSegment.push(current);
      }
    }
    segments.push(currentSegment);

    // Process each continuous segment
    const smoothing_factor = SMOOTHING_WEIGHT;
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
          
          // Adjust control points to create smoother transitions
          const cp1x = prevX + (x - prevX) * (1 - smoothing_factor);
          const cp1y = prevY + (y - prevY) * (1 - smoothing_factor);
          const cp2x = x - (nextX - x) * smoothing_factor;
          const cp2y = y - (nextY - y) * smoothing_factor;
          
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

  const getPlayerPossessionFrames = (video, maxFrame, currentPlayingClipRef) => {
    const possessionRanges = {};
    
    // Scan through frames to find catches and throws
    for (let frame = currentPlayingClipRef.startFrame; frame <= maxFrame; frame++) {
      const tagsForFrame = getTagsForFrame(video, frame);
      
      // Sort tags by frame first
      tagsForFrame.sort((a, b) => (a.frame || 0) - (b.frame || 0));
      tagsForFrame.forEach(tag => {
        const tagName = tag.name?.toLowerCase() || '';
        const playerMatch = tagName.match(/(\w+)\s+(catch|throw)/);
        
        if (playerMatch) {
          const [_, player, action] = playerMatch;
          if (!possessionRanges[player]) {
            possessionRanges[player] = [];
          }

          if (action === 'catch') {
            possessionRanges[player].push({ start: frame });
          } else if (action === 'throw') {
            // Find the last incomplete range and complete it
            const lastRange = possessionRanges[player][possessionRanges[player].length - 1];
            if (lastRange && !lastRange.end) lastRange.end = frame;
          }
        }
      });
    }

    return possessionRanges;
  };

  // Update getActiveThrow to also find the next reception
  const getActiveThrow = (video, currentFrame) => {
    const tagsUpToFrame = [];
    
    // Look ahead an extra 60 frames to find next catch
    for (let frame = 0; frame <= currentFrame + 60; frame++) {
      const tagsForFrame = getTagsForFrame(video, frame);
      tagsForFrame.forEach(tag => {
        if (tag.name?.toLowerCase().includes('catch') || 
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
              // Look ahead for next catch after this throw
              for (let j = i + 1; j < tagsUpToFrame.length; j++) {
                const nextTag = tagsUpToFrame[j];
                if (nextTag.name?.toLowerCase().includes('catch')) {
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
      const catchMatch = tagName.match(/(\w+)\s+catch/);
      
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
        const catchMatch = tagName.match(/(\w+)\s+catch/);
        
        if (catchMatch) {
          const player = catchMatch[1];
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
        const catchMatch = tagName.match(/(\w+)\s+catch/);
        const throwMatch = tagName.match(/(\w+)\s+throw/);
        
        if (catchMatch) {
          const player = catchMatch[1];
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

  React.useEffect(() => {
    onFrameUpdate(frame);
  }, [frame, onFrameUpdate]);

  useEffect(() => {
    if (effectiveCurrentClipRef) {
      console.log('Current playing clip in template:', effectiveCurrentClipRef);
    }
  }, [effectiveCurrentClipRef]);

  // Split segments into continuous possession groups
  const splitIntoContinuousGroups = (segments, predicate) => {
    const groups = [];
    let currentGroup = [];

    segments.forEach((segment, index) => {
      if (predicate(segment)) {
        currentGroup.push(segment);
        // If this is the last segment or next segment doesn't match predicate
        if (index === segments.length - 1 || !predicate(segments[index + 1])) {
          if (currentGroup.length > 0) {
            groups.push([...currentGroup]);
            currentGroup = [];
          }
        }
      }
    });

    return groups;
  };

  // Update where we get parabola color/opacity
  const getParabolaColor = () => {
    if (!currentSettings) return VideoPlayerTrackingSettings.parabolaColor.default;
    return currentSettings.parabolaColor ?? VideoPlayerTrackingSettings.parabolaColor.default;
  };

  const getParabolaOpacity = () => {
    if (!currentSettings) return VideoPlayerTrackingSettings.parabolaOpacity.default;
    return currentSettings.parabolaOpacity ?? VideoPlayerTrackingSettings.parabolaOpacity.default;
  };

  // Update where we get player name color
  const getPlayerNameColor = () => {
    if (!currentSettings) return VideoPlayerTrackingSettings.playerNameColor.default;
    return currentSettings.playerNameColor ?? VideoPlayerTrackingSettings.playerNameColor.default;
  };

  return (
    <AbsoluteFill>
      {tagArray.map((tagInfo, index) => {
        const video = videos.find(v => v.id === tagInfo.videoId);
        if (!video) return null;
        if (!video.filepath) return null;

        // Update this check to use effectiveCurrentClipRef
        const isCurrentClip = effectiveCurrentClipRef && 
          effectiveCurrentClipRef.videoId === tagInfo.videoId &&
          effectiveCurrentClipRef.startFrame === parseInt(tagInfo.startFrame, 10) &&
          effectiveCurrentClipRef.endFrame === parseInt(tagInfo.endFrame, 10);

        const previousClipsDuration = tagArray
          .slice(0, index)
          .reduce((total, tag) => {
            return total + (parseInt(tag.endFrame, 10) - parseInt(tag.startFrame, 10));
          }, 0);

        const clipDuration = parseInt(tagInfo.endFrame, 10) - parseInt(tagInfo.startFrame, 10);
        const currentClipFrame = frame - previousClipsDuration + parseInt(tagInfo.startFrame, 10);
        
        // Update all other instances of currentPlayingClipRef to effectiveCurrentClipRef
        const boxes = isCurrentClip ? getBoxesForFrame(video, currentClipFrame) : [];
        const tagsForFrame = isCurrentClip ? getTagsForFrame(video, currentClipFrame) : [];
        const receptionSequence = isCurrentClip ? getReceptionSequence(video, currentClipFrame, effectiveCurrentClipRef) : [];

        // Get original video dimensions from metadata
        let originalSize = { width: 1920, height: 1080 }; // Default fallback
        try {
          const metadata = getVideoMetadata(video);
          originalSize = {
            width: metadata.width || 1920,
            height: metadata.height || 1080
          };
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
                            color: getPlayerNameColor(),
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
                    {Object.entries(getTrailPositions(video, currentClipFrame, effectiveCurrentClipRef)).map(([player, data]) => {
                      const pathPoints = data.positions.map(pos => {
                        const scaledPos = scaleBox({ bbox: pos.bbox }, originalSize, containerSize);
                        return `${scaledPos.x + scaledPos.width/2},${scaledPos.y + scaledPos.height}`;
                      });

                      const possessionRanges = getPlayerPossessionFrames(video, currentClipFrame, effectiveCurrentClipRef);
                      const playerPossessions = possessionRanges[player] || [];

                      // Split path into segments based on possession
                      const segments = pathPoints.map((point, idx) => {
                        const frame = data.positions[idx].frame;
                        const hasPossession = playerPossessions.some(range => 
                          range.start <= frame && (!range.end || frame <= range.end)
                          && frame >= effectiveCurrentClipRef.startFrame && frame <= effectiveCurrentClipRef.endFrame
                        );
                        return { point, hasPossession, frame, player, playerPossessions };
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
                            {/* Regular paths - draw each continuous non-possession segment separately */}
                            {splitIntoContinuousGroups(segments, s => !s.hasPossession)
                              .filter(group => group.length > 1)
                              .map((nonPossessionGroup, idx) => (
                                <path
                                  key={`regular-${idx}`}
                                  d={smoothPath(nonPossessionGroup.map(s => s.point))}
                                  stroke={getPlayerColor(player)}
                                  strokeWidth={LINE_THICKNESS}
                                  fill="none"
                                  opacity={getPlayerOpacity(player)}
                                />
                              ))
                            }
                            
                            {/* Possession paths - draw each continuous possession segment separately */}
                            {splitIntoContinuousGroups(segments, s => s.hasPossession)
                              .filter(group => group.length > 1)
                              .map((possessionGroup, idx) => (
                                <path
                                  key={`possession-${idx}`}
                                  d={smoothPath(possessionGroup.map(s => s.point))}
                                  stroke={getPlayerColor(player)}
                                  strokeWidth={POSSESSION_LINE_THICKNESS}
                                  fill="none"
                                  opacity={getPlayerOpacity(player) * 1.2}
                                />
                              ))
                            }
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
                            fill={getParabolaColor()}
                            opacity={getParabolaOpacity()}
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
                            stroke={getParabolaColor()}
                            strokeWidth={RECEPTION_LINE_WIDTH}
                            opacity={getParabolaOpacity()}
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
                            stroke={getParabolaColor()}
                            strokeWidth={RECEPTION_LINE_WIDTH}
                            opacity={getParabolaOpacity()}
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