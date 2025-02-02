import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

(async () => {
  // Extract command line arguments
  const inputProps = JSON.parse(require('fs').readFileSync('/tmp/props.json', 'utf8'));
  const outputFileName = require('fs').readFileSync('/tmp/filename.txt', 'utf8');
  const range = JSON.parse(require('fs').readFileSync('/tmp/range.txt', 'utf8'));
  const compositionName = require('fs').readFileSync('/tmp/composition.txt', 'utf8');


  const cleanedProps = JSON.parse(JSON.stringify(inputProps));
  if (cleanedProps.videos) {
    cleanedProps.videos = cleanedProps.videos.map(video => ({
      ...video,
      metadata: {
        ...video.metadata,
        boxes: []
      }
    }));
  }
  console.log(`Cleaned Input props: ${JSON.stringify(cleanedProps, null, 2)}`);
  console.log(`Output filename: ${outputFileName}`);
  console.log(`Range: ${range}`);
  console.log(`Composition name: ${compositionName}`);
  console.log(`# of boxes for first video: ${inputProps.videos[0].metadata.boxes.length}`);
  console.log(`# of non-empty boxes for first video: ${inputProps.videos[0].metadata.boxes.filter(box => JSON.stringify(box) != '{}').length}`);

  const bundled = await bundle({
    entryPoint: require.resolve("./src/index_studio.js"),
    // If you have a webpack override in remotion.config.ts, pass it here as well.
    webpackOverride: (config) => config,
  });

  console.log(`Bundled!`);
  console.log(`Selecting composition...`);

  const composition = await selectComposition({
    serveUrl: bundled,
    id: compositionName,
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
    frameRange: range,
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