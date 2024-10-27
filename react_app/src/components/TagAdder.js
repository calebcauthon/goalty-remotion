import { useCallback } from 'react';

export function useTagAdder(parsedMetadata, currentFrame, onMetadataUpdate) {
  return useCallback((tagName) => {
    const updatedMetadata = { ...parsedMetadata };
    if (!updatedMetadata.tags) {
      updatedMetadata.tags = [];
    }
    updatedMetadata.tags.push({ name: tagName, frame: currentFrame });
    onMetadataUpdate(updatedMetadata);
  }, [parsedMetadata, currentFrame, onMetadataUpdate]);
}
