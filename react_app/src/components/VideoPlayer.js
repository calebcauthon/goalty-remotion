import React, { useEffect } from 'react';
import { useCurrentFrame } from 'remotion';
import { AbsoluteFill } from 'remotion';
import { Video } from 'remotion';

const VideoPlayer = ({ src, onFrameUpdate }) => {
  const frame = useCurrentFrame();

  useEffect(() => {
    onFrameUpdate(frame);
  }, [frame, onFrameUpdate]);

  return (
    <AbsoluteFill>
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
