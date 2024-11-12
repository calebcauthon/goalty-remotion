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

export const VideoFirstFiveSeconds = ({ selectedVideos, videos, selectedTags, useStaticFile }) => {
  const tagArray = Array.from(selectedTags);
  const currentFrame = useCurrentFrame();
  const totalDuration = calculateFirstFiveSecondsDuration(selectedTags);

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
        const totalSeconds = Math.floor(framesRemaining / 30);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const timeRemaining = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (useStaticFile) {
          console.log(`Using static file for ${video.filepath.split('/').pop()}`);
        } else {
          console.log(`Using remote file for ${video.filepath}`);
        }

        const VIDEO_BASE_URL = useStaticFile 
        ? staticFile(`${video.filepath.split('/').pop()}`) 
        : video.filepath

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
                  height: '100%',
                  backgroundColor: index % 2 === 0 ? 'rgba(0, 123, 255, 0.1)' : 'rgba(255, 193, 7, 0.1)'
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
                  top: 20,
                  left: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: 'flex-start'
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
                    {`Clip ${index + 1}/${tagArray.length} • Next in ${timeRemaining}`}
                  </div>
                  <div style={{
                    width: '100%',
                    height: 4,
                    background: 'rgba(255, 255, 255, 0.3)',
                    borderRadius: 2,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${(framesSinceSequenceStart / clipDuration) * 100}%`,
                      background: '#0d6efd',
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
      
      {/* Total progress bar with segments */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: 8,
        background: '#1a1a1a',
        zIndex: 10,
        display: 'flex'
      }}>
        {tagArray.map((tag, index) => {
          const clipDuration = parseInt(tag.endFrame, 10) - parseInt(tag.startFrame, 10);
          const clipWidth = (clipDuration / totalDuration) * 100;
          const previousClipsDuration = tagArray
            .slice(0, index)
            .reduce((total, t) => total + (parseInt(t.endFrame, 10) - parseInt(t.startFrame, 10)), 0);
          
          const baseColor = index % 2 === 0 ? '#ffffff' : '#808080';
          const isCurrentClip = currentFrame >= previousClipsDuration && 
                              currentFrame < (previousClipsDuration + clipDuration);
          
          return (
            <div key={tag.key} style={{
              height: '100%',
              width: `${clipWidth}%`,
              background: baseColor,
              opacity: 0.7,
              position: 'relative'
            }}>
              {isCurrentClip && (
                <div style={{
                  position: 'absolute',
                  left: `${((currentFrame - previousClipsDuration) / clipDuration) * 100}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: '#0d6efd',
                  opacity: 1,
                  border: '2px solid white',
                  boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                  zIndex: 11
                }} />
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}; 