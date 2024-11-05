import React from "react";
import { Composition } from "remotion";
import { VideoFirstFiveSeconds, calculateFirstFiveSecondsDuration } from "../components/templates";
import { getVideoMetadata } from "../components/templates/videoUtils";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="VideoFirstFiveSeconds"
        width={1980}
        height={1020}
        fps={30}
        durationInFrames={30 * 20}
        component={VideoFirstFiveSeconds}
        defaultProps={{
          selectedVideos: [],
          videos: [],
          selectedTags: [],
        }}
        calculateMetadata={({ props, defaultProps }) => {
          const firstVideo = props.videos?.[0];
          const { width, height } = getVideoMetadata(firstVideo);
          
          return {
            durationInFrames: calculateFirstFiveSecondsDuration(props.selectedTags),
            width,
            height,
          };
        }}
      />
    </>
  );
};