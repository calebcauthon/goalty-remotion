import React, { useState, useContext, useCallback } from 'react';
import { GlobalContext } from '../../index';

function TrackSequenceButton({ sequence, video, onClipResults, validDetections, detections, setDetections }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const globalData = useContext(GlobalContext);

  const handleTrack = useCallback(async () => {
    setProcessing(true);
    setError(null);

    try {
      // First do CLIP analysis
      console.log(` doing clip analysis`, { video, sequence });
      const clipResponse = await fetch(`${globalData.APIbaseUrl}/api/videos/clip-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_url: video.filepath,
          frame_number: sequence.startFrame,
          text_prompt: "person player athlete"
        })
      });

      const clipData = await clipResponse.json();
      
      if (clipData.error) {
        throw new Error(clipData.error);
      }

      // Convert detections to the format we need
      const newDetections = clipData.detections.map(d => ({
        x: d.bbox[0],
        y: d.bbox[1],
        width: d.bbox[2] - d.bbox[0],
        height: d.bbox[3] - d.bbox[1],
        label: d.label,
        source: 'clip'
      }));

      setDetections(newDetections);

      // Show results to user
      onClipResults({
        detections: newDetections,
        frame: sequence.startFrame,
        frameImage: clipData.frame_image
      });

    } catch (error) {
      setError(error.message);
      alert(`Failed to analyze: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  }, [setDetections]);

  const handleProcessTracking = useCallback(async () => {
    setProcessing(true);
    try {
      const renderResponse = await fetch(`${globalData.APIbaseUrl}/api/videos/process-tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rectangles: validDetections || detections,
          sourceUrl: video.filepath,
          outputFilename: `tracked_sequence_${sequence.startFrame}-${sequence.endFrame}.mp4`,
          startFrame: sequence.startFrame,
          endFrame: sequence.endFrame
        })
      });

      const renderData = await renderResponse.json();
      
      if (renderData.error) {
        throw new Error(renderData.error);
      }

      alert('Tracking started successfully!');
      // Clear detections using the passed setter
      setDetections(null);
    } catch (error) {
      setError(error.message);
      alert(`Failed to track: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  }, [detections, validDetections, setDetections]);

  if (detections) {
    return (
      <button
        onClick={handleProcessTracking}
        disabled={processing}
        className={`track-sequence-button process ${processing ? 'processing' : ''}`}
        title={error || 'Process tracking for this sequence'}
      >
        {processing ? '🔄' : '🎯'} Process
      </button>
    );
  }

  return (
    <button
      onClick={handleTrack}
      disabled={processing}
      className={`track-sequence-button ${processing ? 'processing' : ''}`}
      title={error || 'Track players in this sequence'}
    >
      {processing ? '🔄' : '👥'} Track
    </button>
  );
}

export default TrackSequenceButton; 