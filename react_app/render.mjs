import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

(async () => {
  // Extract command line arguments
  const inputProps = {"selectedVideos":[27],"videos":[{"filepath":"https://f005.backblazeb2.com/file/remotion-videos/SilKCy+Johnsons+vs+Mephis+Mafia__3-23-2024.mp4","id":27,"name":"SilKCy Johnsons vs Mephis Mafia__3-23-2024","metadata":{"height":480,"width":640,"youtube_url":"https://youtu.be/pfbl8JwF2x4"}}],"selectedTags":[{"endFrame":3017,"key":"27-home_scoring_possession-undefined-2662-3017","startFrame":2662,"tagName":"home_scoring_possession","videoFilepath":"https://f005.backblazeb2.com/file/remotion-videos/SilKCy+Johnsons+vs+Mephis+Mafia__3-23-2024.mp4","videoId":27,"videoName":"SilKCy Johnsons vs Mephis Mafia__3-23-2024"},{"endFrame":22934,"key":"27-home_scoring_possession-undefined-21846-22934","startFrame":21846,"tagName":"home_scoring_possession","videoFilepath":"https://f005.backblazeb2.com/file/remotion-videos/SilKCy+Johnsons+vs+Mephis+Mafia__3-23-2024.mp4","videoId":27,"videoName":"SilKCy Johnsons vs Mephis Mafia__3-23-2024"},{"endFrame":38997,"key":"27-home_scoring_possession-undefined-38642-38997","startFrame":38642,"tagName":"home_scoring_possession","videoFilepath":"https://f005.backblazeb2.com/file/remotion-videos/SilKCy+Johnsons+vs+Mephis+Mafia__3-23-2024.mp4","videoId":27,"videoName":"SilKCy Johnsons vs Mephis Mafia__3-23-2024"},{"endFrame":46695,"key":"27-home_scoring_possession-undefined-44772-46695","startFrame":44772,"tagName":"home_scoring_possession","videoFilepath":"https://f005.backblazeb2.com/file/remotion-videos/SilKCy+Johnsons+vs+Mephis+Mafia__3-23-2024.mp4","videoId":27,"videoName":"SilKCy Johnsons vs Mephis Mafia__3-23-2024"}]}//JSON.parse(require('fs').readFileSync('/tmp/props.json', 'utf8'));
  const outputFileName = "Untitled_Film_2024-11-05_01-08-03.mp4"//require('fs').readFileSync('/tmp/filename.txt', 'utf8');

  console.log(`Input props: ${JSON.stringify(inputProps)}`);
  console.log(`Output filename: ${outputFileName}`);

  const bundled = await bundle({
    entryPoint: require.resolve("./src/index_studio.js"),
    // If you have a webpack override in remotion.config.ts, pass it here as well.
    webpackOverride: (config) => config,
  });

  console.log(`Bundled!`);
  console.log(`Selecting composition...`);

  const composition = await selectComposition({
    serveUrl: bundled,
    id: "VideoFirstFiveSeconds",
    inputProps,
  });

  console.log("Starting to render composition");
  let lastProgress = 0;
  let startTime = Date.now();
  const onProgress = ({progress}) => {
    const currentProgress = Math.floor(progress * 100);
    if (currentProgress > lastProgress) {
      const elapsedMs = Date.now() - startTime;
      const estimatedTotalMs = elapsedMs / progress;
      const remainingMs = estimatedTotalMs - elapsedMs;
      const remainingMins = Math.ceil(remainingMs / 60000);
      console.log(`Rendering is ${currentProgress}% complete (${remainingMins} mins remaining)`);
      lastProgress = currentProgress;
    }
  };

  await renderMedia({
    onProgress,
    codec: "h264",
    composition,
    serveUrl: bundled,
    outputLocation: `out/${outputFileName}`,
    chromiumOptions: {
      enableMultiProcessOnLinux: true,
    },
    inputProps,
  });

  console.log(`Rendered composition ${composition.id}.`);
})(); 