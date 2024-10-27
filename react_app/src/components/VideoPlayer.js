import React from 'react';
import {AbsoluteFill, Video, useCurrentFrame} from 'remotion';

const VideoPlayer = ({src}) => {
  const frame = useCurrentFrame();

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
};

export default VideoPlayer;
