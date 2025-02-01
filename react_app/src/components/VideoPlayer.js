import React, { useEffect } from 'react';
import { useCurrentFrame } from 'remotion';
import { AbsoluteFill } from 'remotion';
import { Video } from 'remotion';

const VideoPlayer = ({ src, onFrameUpdate, onClick }) => {
  const frame = useCurrentFrame();

  useEffect(() => {
    onFrameUpdate(frame);
  }, [frame, onFrameUpdate]);

  const handleClick = (e) => {
    console.log('VideoPlayer click event:', e);
    onClick?.(e);
  };

  return (
    <AbsoluteFill onClick={handleClick}>
      <Video src={src} />
      <div style={{
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        color: 'white',
        padding: '5px 10px',
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        Frame: {frame}
      </div>
    </AbsoluteFill>
  );
}

export default VideoPlayer;
