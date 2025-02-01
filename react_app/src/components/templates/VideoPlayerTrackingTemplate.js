import React, { useMemo, useEffect } from 'react';
import { AbsoluteFill, Video, Sequence, useCurrentFrame, staticFile } from 'remotion';

const TRAIL_LENGTH = 1000; // Number of frames to show in trail
const STRETCH_COUNT = 5; // Only draw every Nth circle

export const calculatePlayerTrackingDuration = (selectedTags) => {
  const tagArray = Array.from(selectedTags);
  return tagArray.reduce((total, tag) => {
    const clipDuration = parseInt(tag.endFrame, 10) - parseInt(tag.startFrame, 10);
    return total + clipDuration;
  }, 0);
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

const getBoxesForFrame = (video, frame) => {
  if (!video?.metadata) {
    console.log('🔍 No metadata found for video', { video });
    return [];
  }
  
  try {
    const metadata = parseJsonIfNecessary(video.metadata);
    if (!metadata.boxes) { 
      console.log('📦 No boxes found in metadata', { metadata }); 
      return []; 
    }

    // Convert frame number from 30fps to 29.97fps
    console.log('⏱️ Converting frame from 30fps to 29.97fps', { before: frame, after: Math.round(frame * (29.97 / 30)) });
    frame = Math.round(frame * (29.97 / 30));
    console.log('🎯 Looking for boxes at frame', frame);

    // Find boxes for this frame
    const targetFrameData = metadata.boxes.find(box => {
      if (!box) return false;
      const players = Object.keys(box);
      return players.some(player => box[player].frame === frame);
    });

    if (!targetFrameData) { 
      console.log('🚫 No boxes found for frame', frame); 
      return []; 
    }

    console.log('✅ Found boxes for frame', { frame, targetFrameData });

    // Convert the frame's boxes into an array of {player, bbox} objects
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

  console.log('📐 Scaling box', {
    original: box,
    originalSize,
    containerSize,
    scales: { x: scaleX, y: scaleY }
  });

  return {
    x: box.bbox[0] * scaleX,
    y: box.bbox[1] * scaleY,
    width: box.bbox[2] * scaleX,
    height: box.bbox[3] * scaleY
  };
};

const getTrailPositions = (video, currentClipFrame) => {
  const positions = [];
  for (let i = 0; i < TRAIL_LENGTH; i += STRETCH_COUNT) { // Skip frames based on STRETCH_COUNT
    const frameToCheck = currentClipFrame - i;
    const boxes = getBoxesForFrame(video, frameToCheck);
    boxes.forEach(box => {
      positions.push({
        player: box.player,
        frame: frameToCheck,
        bbox: box.bbox,
        opacity: 1 - (i / TRAIL_LENGTH)
      });
    });
  }
  return positions;
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
        
        // Get original video dimensions from metadata
        let originalSize = { width: 1920, height: 1080 }; // Default fallback
        try {
          const metadata = parseJsonIfNecessary(video.metadata);
          originalSize = {
            width: metadata.width || 1920,
            height: metadata.height || 1080
          };
          console.log('📏 Original video dimensions', originalSize);
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
                      {/* Red circle at bottom middle */}
                      <div style={{
                        position: 'absolute',
                        left: `${scaledBox.x + scaledBox.width/2 - 4}px`,
                        top: `${scaledBox.y + scaledBox.height - 4}px`,
                        width: '8px',
                        height: '8px',
                        background: 'red',
                        borderRadius: '50%',
                        pointerEvents: 'none'
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
                      </div>
                    </div>
                  );
                })}

                {/* Render trail points */}
                {getTrailPositions(video, currentClipFrame).map((pos, i) => {
                  const scaledPos = scaleBox({ bbox: pos.bbox }, originalSize, containerSize);
                  return (
                    <div
                      key={`trail-${pos.player}-${pos.frame}`}
                      style={{
                        position: 'absolute',
                        left: `${scaledPos.x + scaledPos.width/2 - 4}px`,
                        top: `${scaledPos.y + scaledPos.height - 4}px`,
                        width: '8px',
                        height: '8px',
                        background: 'red',
                        borderRadius: '50%',
                        opacity: pos.opacity,
                        pointerEvents: 'none'
                      }}
                    />
                  );
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