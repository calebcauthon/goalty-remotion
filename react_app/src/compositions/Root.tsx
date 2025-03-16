import React from "react";
import { Composition } from "remotion";
import { 
  VideoFirstFiveSeconds, 
  calculateFirstFiveSecondsDuration,
  VideoPlayerTrackingTemplate,
  calculatePlayerTrackingDuration 
} from "../components/templates";
import { getVideoMetadata } from "../components/templates/videoUtils";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="VideoFirstFiveSeconds"
        width={1980}
        height={1020}
        fps={29.8}
        durationInFrames={29.8 * 20}
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
            width: 1920,
            height: 1080,
            settings: props.settings || {},
          };
        }}
      />
      <Composition
        id="VideoPlayerTracking"
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={30 * 20}
        component={VideoPlayerTrackingTemplate}
        defaultProps={{
          selectedVideos: [],
          videos: [],
          selectedTags: [],
        }}
        calculateMetadata={({ props, defaultProps }) => {
          const firstVideo = props.videos?.[0];
          
          return {
            ...defaultProps,
            ...props,
            videos: props.videos,
            durationInFrames: calculatePlayerTrackingDuration(props.selectedTags),
            width: 1920,
            height: 1080,
            settings: props.settings || {},
          };
        }}
      />
    </>
  );
};