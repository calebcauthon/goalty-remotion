import React, { useMemo } from 'react';
import { AbsoluteFill, Video, useCurrentFrame } from 'remotion';

export const VideoWithBoxes = ({ 
  videoSrc,
  boxes = [],
  selectedPlayers,
  startFrame = 0,
  endFrame,
  xScale = 1,
  yScale = 1
}) => {
  const frame = useCurrentFrame();
  
  // Get boxes for current frame
  const currentBoxes = boxes[frame] || {};
  const numBoxes = selectedPlayers.reduce((count, player) => 
    count + (currentBoxes[player] ? 1 : 0), 0);

  // Generate random colors for each player
  const playerColors = useMemo(() => {
    return selectedPlayers.reduce((acc, player) => {
      acc[player] = `hsl(${Math.random() * 360}, 100%, 50%)`;
      return acc;
    }, {});
  }, [selectedPlayers.join(',')]);

  return (
    <AbsoluteFill>
      <Video
        src={videoSrc}
        startFrom={startFrame}
        endAt={endFrame}
      />
      
      {/* Draw bounding boxes for all selected players */}
      {selectedPlayers.map(player => {
        const playerBox = currentBoxes[player]?.bbox;
        if (!playerBox) return null;

        const scaledBox = {
          x: playerBox[0] * xScale,
          y: playerBox[1] * yScale,
          width: playerBox[2] * xScale,
          height: playerBox[3] * yScale
        };

        return (
          <React.Fragment key={player}>
            {/* Frame number label above box */}
            <div
              style={{
                position: 'absolute',
                left: `${scaledBox.x}px`,
                top: `${scaledBox.y - 20}px`,
                background: 'rgba(0, 0, 0, 0.7)',
                color: playerColors[player],
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                zIndex: 1
              }}
            >
              {player}: {currentBoxes[player].frame}
            </div>
            
            {/* Bounding box */}
            <div
              style={{
                position: 'absolute',
                left: `${scaledBox.x}px`,
                top: `${scaledBox.y}px`,
                width: `${scaledBox.width}px`,
                height: `${scaledBox.height}px`,
                border: `2px solid ${playerColors[player]}`,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
                borderRadius: '2px',
                pointerEvents: 'none'
              }}
            />
          </React.Fragment>
        );
      })}

      {/* Frame counter */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '5px 10px',
        borderRadius: '4px',
        fontSize: '14px',
        fontWeight: 'bold',
        zIndex: 1
      }}>
        Frame: {frame + startFrame}
      </div>

      {/* Status indicator circle */}
      <div
        style={{
          position: 'absolute',
          left: '20px',
          bottom: '20px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: numBoxes > 0 ? '#00ff00' : '#ff0000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#000',
          fontSize: '12px',
          fontWeight: 'bold',
          boxShadow: '0 0 0 2px rgba(0,0,0,0.3)',
          opacity: 0.8
        }}
      >
        {numBoxes}
      </div>
    </AbsoluteFill>
  );
}; 