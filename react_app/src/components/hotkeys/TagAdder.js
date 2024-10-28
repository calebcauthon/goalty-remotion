import { useCallback } from 'react';

export function useTagAdder({ updateMetadata, playerRef }, currentFrame) {
  return useCallback((tagName) => {
    updateMetadata(prevMetadata => {
      const updatedMetadata = { ...prevMetadata };
      if (!updatedMetadata.tags) {
        updatedMetadata.tags = [];
      }
      const frameNumber = playerRef.current?.getCurrentFrame();
      updatedMetadata.tags.push({ name: tagName, frame: frameNumber });
      return updatedMetadata;
    });
  }, [updateMetadata, currentFrame]);
}

