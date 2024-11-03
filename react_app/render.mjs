import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

(async () => {
  const bundled = await bundle({
    entryPoint: require.resolve("./src/index_studio.js"),
    // If you have a webpack override in remotion.config.ts, pass it here as well.
    webpackOverride: (config) => config,
  });

  const inputProps = {"selectedVideos":[3,6],"videos":[{"filepath":"downloads/SilKCy Johnsons vs Mephis Mafia__3-23-2024.mp4","id":3,"name":"SilKCy Johnsons vs Mephis Mafia__3-23-2024","metadata":{"height":1020,"width":1980,"youtube_url":"https://www.youtube.com/watch?v=pfbl8JwF2x4"}},{"filepath":"downloads/Silkcy Johnson vs Madison Hoopers__3-23-2024.mp4","id":6,"name":"Silkcy Johnson vs Madison Hoopers__3-23-2024","metadata":{"height":1020,"width":1980,"youtube_url":"https://www.youtube.com/watch?v=ZEp2LESpFbk"}}],"selectedTags":[{"endFrame":3017,"key":"3-home_scoring_possession-undefined-2662-3017","startFrame":2662,"tagName":"home_scoring_possession","videoFilepath":"downloads/SilKCy Johnsons vs Mephis Mafia__3-23-2024.mp4","videoId":3,"videoName":"SilKCy Johnsons vs Mephis Mafia__3-23-2024"}],"useStaticFile":true}

  const composition = await selectComposition({
    serveUrl: bundled,
    id: "VideoFirstFiveSeconds",
    inputProps,
  });

  console.log("Starting to render composition");

 
  const onProgress = ({progress}) => {
    console.log(`Rendering is ${progress * 100}% complete`);
  };

  await renderMedia({
    onProgress,
    codec: "h264",
    composition,
    serveUrl: bundled,
    outputLocation: `out/${composition.id}.mp4`,
    chromiumOptions: {
      enableMultiProcessOnLinux: true,
    },
    inputProps,
  });

  console.log(`Rendered composition ${composition.id}.`);
})(); 