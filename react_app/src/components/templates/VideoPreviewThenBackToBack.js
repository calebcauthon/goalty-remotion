import React from 'react';
import { AbsoluteFill, Video, Sequence } from 'remotion';

export const VideoPreviewThenBackToBack = ({ selectedVideos, videos, selectedTags }) => { 
  const tagArray = Array.from(selectedTags);

  return (
      <AbsoluteFill>
        <Sequence from={0} durationInFrames={10 * 30}>
          <AbsoluteFill>
            {tagArray.map((tagInfo, index) => {
              const video = videos.find(v => v.id === tagInfo.videoId);
              if (!video) return null;
              
              const columns = Math.min(selectedVideos.size, 2);
              const width = 100 / columns;
              const row = Math.floor(index / columns);
              const col = index % columns;
              
              return (
                <div
                  key={tagInfo.key}
                  style={{
                    position: 'absolute',
                    left: `${col * width}%`,
                    top: `${row * 50}%`,
                    width: `${width}%`,
                    height: '50%',
                    padding: '10px'
                  }}
                >
                  <p className="video-name">
                    {`${video.name} - ${tagInfo.tagName} (${tagInfo.startFrame}-${tagInfo.endFrame})`}
                  </p>
                  <Video
                    src={`http://localhost:5000/downloads/${video.filepath.split('/').pop()}`}
                    startFrom={parseInt(tagInfo.startFrame || '0', 10)}
                    endAt={parseInt(tagInfo.endFrame || '0', 10)}
                    style={{
                      width: '100%',
                      height: '90%'
                    }}
                  />
                </div>
              );
            })}
          </AbsoluteFill>
        </Sequence>

        {tagArray.map((tagInfo, index) => {
          const video = videos.find(v => v.id === tagInfo.videoId);
          if (!video) return null;
          
          const durationOfPreview = 30 * 10;
          const tagsBefore = tagArray.slice(0, index);
          const startFrame = tagsBefore.reduce((total, tag) => {
            return total + (parseInt(tag.endFrame, 10) - parseInt(tag.startFrame, 10));
          }, durationOfPreview);

          const tagDuration = parseInt(tagInfo.endFrame, 10) - parseInt(tagInfo.startFrame, 10);
          
          return (
            <Sequence
              key={tagInfo.key}
              from={startFrame}
              durationInFrames={tagDuration}
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
                    endAt={parseInt(tagInfo.endFrame, 10)}
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