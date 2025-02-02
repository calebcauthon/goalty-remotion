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
    default: '#FFFFFF'  // Changed to white for better contrast
  },
  playerNameBgColor: {
    type: 'color',
    label: 'Player Name Background',
    default: '#FF6B00'
  },
  boundingBoxColor: {
    type: 'color',
    label: 'Bounding Box Color',
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
  boundingBoxOpacity: {
    type: 'range',
    label: 'Bounding Box Opacity',
    min: 0,
    max: 1,
    step: 0.1,
    default: 1
  },
  playerNameOpacity: {
    type: 'range',
    label: 'Player Name Opacity',
    min: 0,
    max: 1,
    step: 0.1,
    default: 1
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
      useCustomSettings: {  // Single override toggle
        type: 'checkbox',
        label: 'Use Custom Settings',
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
      // Custom color overrides
      customBoxColor: {
        type: 'color',
        label: 'Box Color',
        default: '#FF6B00'
      },
      customNameColor: {
        type: 'color',
        label: 'Name Text Color',
        default: '#FFFFFF'
      },
      customNameBgColor: {
        type: 'color',
        label: 'Name Background',
        default: '' // Remove default so it uses path color
      },
      // Custom opacity overrides
      customBoxOpacity: {
        type: 'range',
        label: 'Box Opacity',
        min: 0,
        max: 1,
        step: 0.1,
        default: 1
      },
      customNameOpacity: {
        type: 'range',
        label: 'Name Opacity',
        min: 0,
        max: 1,
        step: 0.1,
        default: 1
      }
    }
  },
  stretchCount: {
    type: 'range',
    label: 'Path Detail %',
    min: 0,
    max: 100,
    step: 1,
    default: 30
  },
  smoothingFactor: {
    type: 'range',
    label: 'Path Smoothing',
    min: 0,
    max: 100,
    step: 1,
    default: 70  // Maps to 0.7
  },
  distanceThreshold: {
    type: 'range',
    label: 'Point Distance %',
    min: 1,
    max: 100,
    step: 1,
    default: 10  // 10% of screen size
  },
  minFrameDistance: {
    type: 'range',
    label: 'Min Frames Between Points',
    min: 1,
    max: 60,
    step: 1,
    default: 30
  },
  showEntireClip: {
    type: 'checkbox',
    label: 'Show Entire Clip',
    default: false
  },
  showDebugOverlay: {
    type: 'checkbox',
    label: 'Show Debug Overlay',
    default: false
  },
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

// Add this helper function to convert linear slider value to exponential percentage
const getExponentialPercentage = (linearValue) => {
  // Convert 0-100 to 0-1
  const x = linearValue / 100;
  
  // Exponential curve: y = (e^(5x) - 1) / (e^5 - 1)
  // This gives a nice curve that's more granular at lower values
  const exponentialValue = (Math.exp(5 * x) - 1) / (Math.exp(5) - 1);
  
  // Convert back to percentage (1-100)
  return Math.max(1, Math.min(100, exponentialValue * 100));
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
  settings={},
  filmId // Add filmId prop
}) => {
  const tagArray = useMemo(() => Array.from(selectedTags), []);
  const frame = useCurrentFrame();
  // Use provided currentPlayingClipRef or determine it from frame
  const effectiveCurrentClipRef = useMemo(() => getCurrentClipFromFrame(frame, selectedTags), [frame, selectedTags]);

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
      const newSettings = settings[effectiveCurrentClipRef.key] || {};
      setCurrentSettings(newSettings);
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
    
    const opacity = clipSettings?.pathOpacity;
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

  // Update getTrailPositions to only include catches as key points
  const getTrailPositions = (video, currentClipFrame, currentPlayingClipRef) => {
    const playerPaths = {};
    const frameSet = new Set();
    
    // Get the linear value from settings (0-100)
    const linearValue = currentSettings?.stretchCount ?? VideoPlayerTrackingSettings.stretchCount.default;
    
    // Convert to exponential percentage
    const detailPercentage = getExponentialPercentage(linearValue);

    // Helper to collect all frames for a player
    const collectAllFrames = (startFrame, endFrame) => {
      const frames = [];
      for (let frame = startFrame; frame <= endFrame; frame++) {
        const boxes = getBoxesForFrame(video, frame);
        boxes.forEach(box => {
          if (!playerPaths[box.player]) {
            playerPaths[box.player] = {
              positions: [],
              receptionFrames: []
            };
          }
          frames.push({
            frame,
            player: box.player,
            bbox: box.bbox
          });
        });
      }
      return frames;
    };

    // Collect all frames first
    const allFrames = collectAllFrames(currentPlayingClipRef.startFrame, currentClipFrame);

    // Group frames by player
    const framesByPlayer = {};
    allFrames.forEach(frame => {
      if (!framesByPlayer[frame.player]) {
        framesByPlayer[frame.player] = [];
      }
      framesByPlayer[frame.player].push(frame);
    });

    // For each player, select frames based on percentage
    Object.entries(framesByPlayer).forEach(([player, frames]) => {
      frames.sort((a, b) => a.frame - b.frame);
      
      // Always include start and current frame
      const mustIncludeFrames = new Set([
        currentPlayingClipRef.startFrame,
        currentClipFrame
      ]);

      // Calculate how many points to keep based on percentage
      const totalPoints = frames.length;
      const keepCount = Math.max(2, Math.ceil(totalPoints * (detailPercentage / 100)));
      const step = Math.max(1, Math.floor(totalPoints / keepCount));

      // Select frames
      const selectedFrames = new Set();
      
      // Add must-include frames
      mustIncludeFrames.forEach(frame => {
        const closest = frames.reduce((prev, curr) => 
          Math.abs(curr.frame - frame) < Math.abs(prev.frame - frame) ? curr : prev
        );
        selectedFrames.add(closest.frame);
      });

      // Add regularly spaced frames
      for (let i = 0; i < frames.length; i += step) {
        selectedFrames.add(frames[i].frame);
      }

      // Add only catch events if they're not too close to existing points
      frames.forEach(frameData => {
        const tagsForFrame = getTagsForFrame(video, frameData.frame);
        const isCatch = tagsForFrame.some(tag => {
          const tagName = tag.name?.toLowerCase() || '';
          return tagName.includes(`${player.toLowerCase()} catch`);
        });

        if (isCatch) {
          const minDistance = currentSettings?.minFrameDistance ?? VideoPlayerTrackingSettings.minFrameDistance.default;
          // Check if this catch is too close to any existing selected frame
          const isTooClose = Array.from(selectedFrames).some(existingFrame => 
            Math.abs(existingFrame - frameData.frame) < minDistance
          );

          if (!isTooClose) {
            selectedFrames.add(frameData.frame);
          }
        }
      });

      // Convert selected frames back to positions
      const selectedPositions = frames
        .filter(f => selectedFrames.has(f.frame))
        .sort((a, b) => a.frame - b.frame);

      playerPaths[player] = {
        positions: selectedPositions.map(f => ({
          frame: f.frame,
          bbox: f.bbox
        })),
        receptionFrames: frames
          .filter(f => hasReceptionAtFrame(video, f.frame, player))
          .map(f => f.frame)
      };
    });

    return playerPaths;
  };

  // Add helper functions to get smoothing settings
  const getSmoothingFactor = () => {
    if (!currentSettings) return 0.7;
    const value = currentSettings.smoothingFactor ?? VideoPlayerTrackingSettings.smoothingFactor.default;
    return value / 100;
  };

  const getDistanceThreshold = () => {
    if (!currentSettings) return 0.1;
    const value = currentSettings.distanceThreshold ?? VideoPlayerTrackingSettings.distanceThreshold.default;
    return value / 100;
  };

  // Update smoothPath to use the new configurable values
  const smoothPath = (points) => {
    if (points.length < 2) return '';
    
    // Use configurable distance threshold
    const threshold = Math.max(width, height) * getDistanceThreshold();
    
    // Create a single path with distance-based segmentation
    const filteredPoints = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      const prev = filteredPoints[filteredPoints.length - 1];
      
      const [prevX, prevY] = prev.split(',').map(Number);
      const [currX, currY] = current.split(',').map(Number);
      const distance = Math.sqrt(Math.pow(currX - prevX, 2) + Math.pow(currY - prevY, 2));
      
      if (distance < threshold) {
        filteredPoints.push(current);
      }
    }

    // Use configurable smoothing factor
    const smoothing_factor = getSmoothingFactor();
    
    // Create a single smooth path
    const [first, ...rest] = filteredPoints;
    let pathD = `M ${first}`;
    
    for (let i = 0; i < rest.length; i++) {
      const current = rest[i];
      const prev = i === 0 ? first : rest[i - 1];
      const next = rest[i + 1] || current;
      
      const [x, y] = current.split(',').map(Number);
      const [prevX, prevY] = prev.split(',').map(Number);
      const [nextX, nextY] = next.split(',').map(Number);
      
      const cp1x = prevX + (x - prevX) * (1 - smoothing_factor);
      const cp1y = prevY + (y - prevY) * (1 - smoothing_factor);
      const cp2x = x - (nextX - x) * smoothing_factor;
      const cp2y = y - (nextY - y) * smoothing_factor;
      
      pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${y}`;
    }
    
    return pathD;
  };

  // Add new constants
  const RECEPTION_LINE_COLOR = '#0000FF';
  const RECEPTION_LINE_OPACITY = 0.6;
  const RECEPTION_LINE_WIDTH = 3;

  // Add this helper function to find throw events
  const getThrowEvents = (video, startFrame, endFrame) => {
    const throwEvents = [];
    
    for (let frame = startFrame; frame <= endFrame; frame++) {
      const tagsForFrame = getTagsForFrame(video, frame);
      const boxes = getBoxesForFrame(video, frame);
      
      tagsForFrame.forEach(tag => {
        const tagName = tag.name?.toLowerCase() || '';
        const throwMatch = tagName.match(/(\w+)\s+throw/);
        
        if (throwMatch) {
          const thrower = throwMatch[1];
          const throwerBox = boxes.find(box => box.player === thrower);
          if (throwerBox) {
            throwEvents.push({
              frame,
              thrower,
              bbox: throwerBox.bbox
            });
          }
        }
      });
    }
    
    return throwEvents;
  };

  // Update the reception sequence code to include throw positions
  const getReceptionSequence = (video, currentClipFrame, currentPlayingClipRef) => {
    const sequence = [];
    const throwEvents = getThrowEvents(video, currentPlayingClipRef.startFrame, currentClipFrame);
    
    // Collect all reception points up to current frame
    for (let frame = currentPlayingClipRef.startFrame; frame <= currentClipFrame; frame++) {
      const boxes = getBoxesForFrame(video, frame);
      const tagsForFrame = getTagsForFrame(video, frame);
      
      tagsForFrame.forEach(tag => {
        const tagName = tag.name?.toLowerCase() || '';
        const catchMatch = tagName.match(/(\w+)\s+catch/);
        
        if (catchMatch) {
          const receiver = catchMatch[1];
          const receiverBox = boxes.find(box => box.player === receiver);
          if (receiverBox) {
            // Find the most recent throw event before this catch
            const throwEvent = throwEvents
              .filter(t => t.frame < frame)
              .sort((a, b) => b.frame - a.frame)[0]; // Get most recent throw

            if (throwEvent) {
              sequence.push({
                throwFrame: throwEvent.frame,
                throwBbox: throwEvent.bbox,
                catchFrame: frame,
                catchBbox: receiverBox.bbox,
                thrower: throwEvent.thrower,
                receiver
              });
            }
          }
        }
      });
    }

    // Sort by catch frame
    sequence.sort((a, b) => a.catchFrame - b.catchFrame);
    return sequence;
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

  // Add these helper functions near the other getter functions
  const getBoundingBoxColor = () => {
    if (!currentSettings) return VideoPlayerTrackingSettings.boundingBoxColor.default;
    return currentSettings.boundingBoxColor ?? VideoPlayerTrackingSettings.boundingBoxColor.default;
  };

  const getPlayerNameBgColor = () => {
    if (!currentSettings) return VideoPlayerTrackingSettings.playerNameBgColor.default;
    return currentSettings.playerNameBgColor ?? VideoPlayerTrackingSettings.playerNameBgColor.default;
  };

  // Add new getter functions
  const getBoundingBoxOpacity = () => {
    if (!currentSettings) return VideoPlayerTrackingSettings.boundingBoxOpacity.default;
    return currentSettings.boundingBoxOpacity ?? VideoPlayerTrackingSettings.boundingBoxOpacity.default;
  };

  const getPlayerNameOpacity = () => {
    if (!currentSettings) return VideoPlayerTrackingSettings.playerNameOpacity.default;
    return currentSettings.playerNameOpacity ?? VideoPlayerTrackingSettings.playerNameOpacity.default;
  };

  // Update the getter functions to handle the new overrides
  const getPlayerBoundingBoxColor = (player) => {
    if (!currentSettings) return getBoundingBoxColor();

    const clipSettings = currentSettings.playerSettings?.[player];
    if (clipSettings?.useCustomSettings) {
      return clipSettings?.customBoxColor ?? VideoPlayerTrackingSettings.playerSettings.perPlayer.customBoxColor.default;
    }
    
    return getBoundingBoxColor();
  };

  const getPlayerNameTextColor = (player) => {
    if (!currentSettings) return getPlayerNameColor();

    const clipSettings = currentSettings.playerSettings?.[player];
    if (clipSettings?.useCustomSettings) {
      return clipSettings?.customNameColor ?? VideoPlayerTrackingSettings.playerSettings.perPlayer.customNameColor.default;
    }
    
    return getPlayerNameColor();
  };

  const getPlayerNameBackgroundColor = (player) => {
    if (!currentSettings) return getPlayerColor(player); // Default to path color

    const clipSettings = currentSettings.playerSettings?.[player];
    if (clipSettings?.useCustomSettings) {
      // If they have a custom background color set, use that
      if (clipSettings.customNameBgColor) {
        return clipSettings.customNameBgColor;
      }
      // Otherwise default to their path color
      return clipSettings.pathColor ?? getPlayerColor(player);
    }
    
    return getPlayerNameBgColor();
  };

  // Update the opacity getters to use useCustomSettings instead of useCustomOpacity
  const getPlayerBoundingBoxOpacity = (player) => {
    if (!currentSettings) return getBoundingBoxOpacity();

    const clipSettings = currentSettings.playerSettings?.[player];
    if (clipSettings?.hidden) return 0;
    
    if (clipSettings?.useCustomSettings) {
      return clipSettings?.customBoxOpacity ?? VideoPlayerTrackingSettings.playerSettings.perPlayer.customBoxOpacity.default;
    }
    
    return getBoundingBoxOpacity();
  };

  const getPlayerNameTagOpacity = (player) => {
    if (!currentSettings) return getPlayerNameOpacity();

    const clipSettings = currentSettings.playerSettings?.[player];
    if (clipSettings?.hidden) return 0;
    
    if (clipSettings?.useCustomSettings) {
      return clipSettings?.customNameOpacity ?? VideoPlayerTrackingSettings.playerSettings.perPlayer.customNameOpacity.default;
    }
    
    return getPlayerNameOpacity();
  };

  // In the template component, add this after other settings getters
  const getShowEntireClip = () => {
    if (!currentSettings) return VideoPlayerTrackingSettings.showEntireClip.default;
    return currentSettings.showEntireClip ?? VideoPlayerTrackingSettings.showEntireClip.default;
  };

  // Add getter function with the other getters
  const getShowDebugOverlay = () => {
    if (!currentSettings) return VideoPlayerTrackingSettings.showDebugOverlay.default;
    return currentSettings.showDebugOverlay ?? VideoPlayerTrackingSettings.showDebugOverlay.default;
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
        
        // Add this to override the frame when showEntireClip is enabled
        const effectiveClipFrame = getShowEntireClip() ? 
          parseInt(tagInfo.endFrame, 10) : 
          currentClipFrame;
        
        // Use currentClipFrame for boxes and tags, effectiveClipFrame for paths and throws
        const boxes = isCurrentClip ? getBoxesForFrame(video, currentClipFrame) : [];
        const tagsForFrame = isCurrentClip ? getTagsForFrame(video, currentClipFrame) : [];
        const receptionSequence = isCurrentClip ? getReceptionSequence(video, effectiveClipFrame, effectiveCurrentClipRef) : [];

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
                      const isHidden = currentSettings?.playerSettings?.[box.player]?.hidden ?? false;
                      const baseOpacity = isHidden ? 0 : 1;
                      
                      return (
                        <div key={i}>
                          <div style={{
                            position: 'absolute',
                            left: `${scaledBox.x}px`,
                            top: `${scaledBox.y}px`,
                            width: `${scaledBox.width}px`,
                            height: `${scaledBox.height}px`,
                            border: `2px solid ${getPlayerBoundingBoxColor(box.player)}`,
                            boxSizing: 'border-box',
                            pointerEvents: 'none',
                            opacity: baseOpacity * getPlayerBoundingBoxOpacity(box.player)
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
                            opacity: baseOpacity * getPlayerBoundingBoxOpacity(box.player)
                          }} />
                          <div style={{
                            position: 'absolute',
                            left: `${scaledBox.x}px`,
                            top: `${scaledBox.y - 25}px`,
                            background: getPlayerNameBackgroundColor(box.player),
                            color: getPlayerNameTextColor(box.player),
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            opacity: baseOpacity * getPlayerNameTagOpacity(box.player)
                          }}>
                            {box.player}
                            {hasReception ? ' 🏈' : ''}
                          </div>
                        </div>
                      );
                    })}

                    {/* Render trail points */}
                    {Object.entries(getTrailPositions(video, effectiveClipFrame, effectiveCurrentClipRef)).map(([player, data]) => {
                      const pathPoints = data.positions.map(pos => {
                        const scaledPos = scaleBox({ bbox: pos.bbox }, originalSize, containerSize);
                        return `${scaledPos.x + scaledPos.width/2},${scaledPos.y + scaledPos.height}`;
                      });

                      const possessionRanges = getPlayerPossessionFrames(video, effectiveClipFrame, effectiveCurrentClipRef);
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
                            {/* Regular paths */}
                            <path
                              key={`trail-${player}`}
                              d={smoothPath(pathPoints)}
                              stroke={getPlayerColor(player)}
                              strokeWidth={LINE_THICKNESS}
                              fill="none"
                              opacity={getPlayerOpacity(player)}
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
                            fill={getParabolaColor()}
                            opacity={getParabolaOpacity()}
                          />
                        </marker>
                      </defs>
                      
                      {/* Completed throws */}
                      {receptionSequence.map((reception, i) => {
                        const throwPos = scaleBox({ bbox: reception.throwBbox }, originalSize, containerSize);
                        const catchPos = scaleBox({ bbox: reception.catchBbox }, originalSize, containerSize);
                        
                        // Calculate control point for the parabola
                        const midX = (throwPos.x + catchPos.x + throwPos.width/2 + catchPos.width/2) / 2;
                        const midY = Math.min(throwPos.y, catchPos.y) - 
                          Math.abs(catchPos.x - throwPos.x) * THROW_HEIGHT_FACTOR - 
                          Math.abs(catchPos.y - throwPos.y) * THROW_HEIGHT_FACTOR;
                        
                        return (
                          <path
                            key={`reception-line-${i}`}
                            d={`M ${throwPos.x + throwPos.width/2} ${throwPos.y + throwPos.height}
                               Q ${midX} ${midY} 
                               ${catchPos.x + catchPos.width/2} ${catchPos.y + catchPos.height}`}
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
                        const activeThrow = getActiveThrow(video, effectiveClipFrame);
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
                        const frameProgress = (effectiveClipFrame - activeThrow.startFrame) / throwDuration;
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

                    {/* Debug overlay */}
                    {getShowDebugOverlay() && (
                      <div style={{
                        position: 'absolute',
                        bottom: 20,
                        right: 20,
                        background: 'rgba(0, 0, 0, 0.8)',
                        color: '#00FF00',
                        padding: '12px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        width: '300px',
                        maxHeight: '80vh',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <div style={{ 
                          fontWeight: 'bold', 
                          borderBottom: '1px solid #00FF00',
                          paddingBottom: '4px'
                        }}>
                          🔍 Debug Info
                        </div>
                        {(() => {
                          const metadata = getVideoMetadata(video);
                          const currentBoxes = getBoxesForFrame(video, currentClipFrame);
                          const currentTags = getTagsForFrame(video, currentClipFrame);
                          
                          return (
                            <>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div>Frame: {currentClipFrame}</div>
                                <div>Clip: {tagInfo.key}</div>
                                <div>Video: {video.id}</div>
                              </div>

                              {/* Add new section for clip reference info */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ color: '#FFF', marginBottom: '2px' }}>Clip Reference</div>
                                <div>• Start: {effectiveCurrentClipRef?.startFrame || '?'}</div>
                                <div>• End: {effectiveCurrentClipRef?.endFrame || '?'}</div>
                                <div>• Tag: {effectiveCurrentClipRef?.tagName || '?'}</div>
                                <div>• Key: {effectiveCurrentClipRef?.key || '?'}</div>
                                <div style={{ fontSize: '12px', color: '#AAA', marginLeft: '8px' }}>
                                  Video: {effectiveCurrentClipRef?.videoName || '?'}
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ color: '#FFF', marginBottom: '2px' }}>Metadata</div>
                                <div>• Resolution: {metadata?.width || '?'}x{metadata?.height || '?'}</div>
                                <div>• Total Boxes: {metadata?.boxes?.length || 0}</div>
                                <div>• Total Tags: {metadata?.tags?.length || 0}</div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ color: '#FFF', marginBottom: '2px' }}>Current Frame</div>
                                <div>• Active Boxes: {currentBoxes.length}</div>
                                <div>• Active Tags: {currentTags.length}</div>
                                {currentBoxes.length > 0 && (
                                  <div style={{ marginLeft: '8px', fontSize: '12px', color: '#AAA' }}>
                                    {currentBoxes.map((box, i) => (
                                      <div key={i}>- {box.player}: [{box.bbox.map(n => n.toFixed(1)).join(', ')}]</div>
                                    ))}
                                  </div>
                                )}
                                {currentTags.length > 0 && (
                                  <div style={{ marginLeft: '8px', fontSize: '12px', color: '#AAA' }}>
                                    {currentTags.map((tag, i) => (
                                      <div key={i}>- {tag.name}</div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ color: '#FFF', marginBottom: '2px' }}>Settings</div>
                                <div>• Show Full Path: {getShowEntireClip() ? 'Yes' : 'No'}</div>
                                <div>• Path Detail: {getStretchCount()}%</div>
                                <div>• Smoothing: {getSmoothingFactor().toFixed(2)}</div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
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