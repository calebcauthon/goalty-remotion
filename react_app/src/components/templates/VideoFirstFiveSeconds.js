import React from 'react';
import { AbsoluteFill, Video, Sequence } from 'remotion';

export const VideoFirstFiveSeconds = ({ selectedVideos, videos, selectedTags }) => {
  const tagArray = Array.from(selectedTags);

  return (
    <AbsoluteFill>
      {tagArray.map((tagInfo, index) => {
        const video = videos.find(v => v.id === tagInfo.videoId);
        if (!video) return null;

        return (
          <Sequence
            key={tagInfo.key}
            from={index * 5 * 30} // 5 seconds per clip
            durationInFrames={5 * 30} // 5 seconds
          >
            <AbsoluteFill>
              <div
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  padding: '10px'
                }}
              >
                <p className="video-name">
                  {`${video.name} - ${tagInfo.tagName} (${tagInfo.startFrame}-${tagInfo.endFrame})`}
                </p>
                <Video
                  src={`http://localhost:5000/downloads/${video.filepath.split('/').pop()}`}
                  startFrom={parseInt(tagInfo.startFrame, 10)}
                  endAt={parseInt(tagInfo.startFrame, 10) + 5 * 30} // First 5 seconds
                  style={{
                    width: '100%',
                    height: '90%'
                  }}
                />
              </div>
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}; 