import { useCallback } from 'react';

export function useTagAdder({ updateMetadata }, currentFrame) {
  return useCallback((tagName) => {
    updateMetadata(prevMetadata => {
      const updatedMetadata = { ...prevMetadata };
      if (!updatedMetadata.tags) {
        updatedMetadata.tags = [];
      }
      updatedMetadata.tags.push({ name: tagName, frame: currentFrame });
      return updatedMetadata;
    });
  }, [updateMetadata, currentFrame]);
}
