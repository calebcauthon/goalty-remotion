import { useCallback } from 'react';

export function useHighlightAdder({ parsedMetadata, onMetadataUpdate, playerRef, registerHotkey }, currentFrame) {
  return useCallback(() => {
    const updatedMetadata = { ...parsedMetadata };
    if (!updatedMetadata.tags) {
      updatedMetadata.tags = [];
    }
    updatedMetadata.tags.push({ name: 'highlight init', frame: currentFrame });
    playerRef.current?.pause();

    registerHotkey('x', () => {
      updatedMetadata.tags.push({ name: 'highlight start', frame: currentFrame });
      onMetadataUpdate(updatedMetadata);
      playerRef.current?.play();
    });
    onMetadataUpdate(updatedMetadata);

  }, [parsedMetadata, currentFrame, onMetadataUpdate, playerRef]);
}
