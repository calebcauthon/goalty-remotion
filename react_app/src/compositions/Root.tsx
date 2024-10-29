import React from "react";
import { Composition } from "remotion";
import { MyComponent } from "./testComp";
import { VideoPreviewThenBackToBack } from "../components/ViewFilm";

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
        durationInFrames={30 * 30}
        component={VideoPreviewThenBackToBack}
        defaultProps={{
          selectedVideos: [],
          videos: [],
          selectedTags: [],
        }}
      />
    </>
  );
};