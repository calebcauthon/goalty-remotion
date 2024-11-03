import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

(async () => {
  // Extract command line arguments
  const inputProps = JSON.parse(require('fs').readFileSync('/tmp/props.json', 'utf8'));
  const outputFileName = require('fs').readFileSync('/tmp/filename.txt', 'utf8');

  console.log(`Input props: ${JSON.stringify(inputProps)}`);
  console.log(`Output filename: ${outputFileName}`);

  const bundled = await bundle({
    entryPoint: require.resolve("./src/index_studio.js"),
    // If you have a webpack override in remotion.config.ts, pass it here as well.
    webpackOverride: (config) => config,
  });

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
    outputLocation: `out/${outputFileName}`,
    chromiumOptions: {
      enableMultiProcessOnLinux: true,
    },
    inputProps,
  });

  console.log(`Rendered composition ${composition.id}.`);
})(); 