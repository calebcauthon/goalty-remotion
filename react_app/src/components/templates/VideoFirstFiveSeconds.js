import React from 'react';
import { AbsoluteFill, Video, Sequence, useCurrentFrame, staticFile } from 'remotion';

export const calculateFirstFiveSecondsDuration = (selectedTags) => {
  const tagArray = Array.from(selectedTags);
  // Calculate total duration based on each clip's actual length
  return tagArray.reduce((total, tag) => {
    const clipDuration = parseInt(tag.endFrame, 10) - parseInt(tag.startFrame, 10);
    return total + clipDuration;
  }, 0);
};

export const VideoFirstFiveSeconds = ({ selectedVideos, videos, selectedTags }) => {
  const tagArray = Array.from(selectedTags);
  const currentFrame = useCurrentFrame();

  return (
    <AbsoluteFill>
      {tagArray.map((tagInfo, index) => {
        const video = videos.find(v => v.id === tagInfo.videoId);
        if (!video) return null;

        // Calculate the starting frame for this sequence
        const previousClipsDuration = tagArray
          .slice(0, index)
          .reduce((total, tag) => {
            return total + (parseInt(tag.endFrame, 10) - parseInt(tag.startFrame, 10));
          }, 0);

        // Calculate this clip's duration
        const clipDuration = parseInt(tagInfo.endFrame, 10) - parseInt(tagInfo.startFrame, 10);

        // Calculate how many frames are left in this clip
        const framesSinceSequenceStart = Math.max(0, currentFrame - previousClipsDuration);
        const framesRemaining = Math.max(0, clipDuration - framesSinceSequenceStart);
        const secondsRemaining = (framesRemaining / 30).toFixed(1);

        const VIDEO_BASE_URL = process.env.REACT_APP_VIDEO_BASE_URL ? staticFile(`${video.filepath.split('/').pop()}`) : `http://localhost:5000/downloads/${video.filepath.split('/').pop()}`;
        return (
          <Sequence
            key={tagInfo.key}
            from={previousClipsDuration}
            durationInFrames={clipDuration}
          >
            <AbsoluteFill>
              <div
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%'
                }}
              >
                <Video
                  src={VIDEO_BASE_URL}
                  startFrom={parseInt(tagInfo.startFrame, 10)}
                  endAt={parseInt(tagInfo.endFrame, 10)}
                  style={{
                    width: '100%',
                    height: '100%'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: 20,
                  right: 300,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: 'flex-end'
                }}>
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    zIndex: 1
                  }}>
                    {`Clip ${index + 1}/${tagArray.length} • Next in ${secondsRemaining}s...`}
                  </div>
                  <div style={{
                    width: '100%',
                    height: 4,
                    background: 'rgba(255, 255, 255, 0.3)',
                    borderRadius: 2,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'relative',
                      height: '100%',
                      width: `${(framesSinceSequenceStart / clipDuration) * 100}%`,
                      background: 'white',
                      borderRadius: 2,
                      transition: 'width 0.1s linear'
                    }} />
                  </div>
                </div>
              </div>
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}; 