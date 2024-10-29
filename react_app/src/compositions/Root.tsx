import React from "react";
import { Composition } from "remotion";
import { MyComponent } from "./testComp";
import { VideoPreviewThenBackToBack, VideoFirstFiveSeconds, calculateFirstFiveSecondsDuration } from "../components/templates";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="myVideo"
        width={1080}
        height={1080}
        fps={30}
        durationInFrames={30}
        component={MyComponent}
        defaultProps={{
          propOne: "Hi",
          propTwo: 10,
        }}
      />

      <Composition
        id="viewFilm"
        width={1080}
        height={1080}
        fps={30}
        durationInFrames={30 * 20}
        component={VideoPreviewThenBackToBack}
        defaultProps={{
          selectedVideos: [],
          videos: [],
          selectedTags: [],
        }}
      />


      <Composition
        id="FirstFive"
        width={1080}
        height={1080}
        fps={30}
        durationInFrames={30 * 20}
        component={VideoFirstFiveSeconds}
        defaultProps={{
          selectedVideos: [],
          videos: [],
          selectedTags: [],
        }}
        calculateMetadata={({ props, defaultProps, abortSignal }) => {
          return {
            durationInFrames: calculateFirstFiveSecondsDuration(props.selectedTags)
          }
        }}
      />
    </>
  );
};