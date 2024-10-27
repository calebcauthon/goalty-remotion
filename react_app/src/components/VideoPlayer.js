import React from 'react';
import {AbsoluteFill, Video} from 'remotion';

const VideoPlayer = ({src}) => {
  return (
    <AbsoluteFill>
      <Video src={src} />
    </AbsoluteFill>
  );
};

export default VideoPlayer;
