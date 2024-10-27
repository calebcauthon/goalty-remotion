import { useCallback } from 'react';

export function useHighlightAdder({ updateMetadata, playerRef, registerTemporaryHotkey, clearTemporaryHotkeys }, currentFrame) {
  return useCallback(() => {
    updateMetadata(prevMetadata => {
      const updatedMetadata = { ...prevMetadata };
      if (!updatedMetadata.tags) {
        updatedMetadata.tags = [];
      }
      updatedMetadata.tags.push({ name: 'highlight init', frame: currentFrame });
      return updatedMetadata;
    });

    playerRef.current?.pause();

    registerTemporaryHotkey('x', () => {
      updateMetadata(prevMetadata => {
        const updatedMetadata = { ...prevMetadata };
        updatedMetadata.tags.push({ name: 'highlight start', frame: currentFrame });
        return updatedMetadata;
      });
      playerRef.current?.play();
      clearTemporaryHotkeys();
    });

  }, [updateMetadata, currentFrame, playerRef, registerTemporaryHotkey, clearTemporaryHotkeys]);
}
