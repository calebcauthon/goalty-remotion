import { useCallback } from 'react';

export function useHighlightAdder({ parsedMetadata, onMetadataUpdate, playerRef }, currentFrame) {
  return useCallback(() => {
    const updatedMetadata = { ...parsedMetadata };
    if (!updatedMetadata.tags) {
      updatedMetadata.tags = [];
    }
    updatedMetadata.tags.push({ name: 'highlight', frame: currentFrame });
    onMetadataUpdate(updatedMetadata);
    playerRef.current?.pause();
  }, [parsedMetadata, currentFrame, onMetadataUpdate, playerRef]);
}
