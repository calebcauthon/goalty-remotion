import { useCallback } from 'react';

export function useTagAdder({ parsedMetadata, onMetadataUpdate }, currentFrame) {
  return useCallback((tagName) => {
    const updatedMetadata = { ...parsedMetadata };
    if (!updatedMetadata.tags) {
      updatedMetadata.tags = [];
    }
    updatedMetadata.tags.push({ name: tagName, frame: currentFrame });
    onMetadataUpdate(updatedMetadata);
  }, [parsedMetadata, currentFrame, onMetadataUpdate]);
}
