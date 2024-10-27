import { useCallback, useEffect } from 'react';

export function useHotkeys(hotkeyMode, { parsedMetadata, playerRef, onMetadataUpdate }, currentFrame) {

  const handleHotkey = useCallback((event) => {
    if (!hotkeyMode) return;

    let updatedMetadata = { ...parsedMetadata };

    if (!updatedMetadata.tags) {
      updatedMetadata.tags = [];
    }

    switch (event.key) {
      case '1':
        updatedMetadata.tags.push({ name: 'game_start', frame: currentFrame });
        onMetadataUpdate(updatedMetadata);
        break;
      case '9':
        updatedMetadata.tags.push({ name: 'game_end', frame: currentFrame });
        onMetadataUpdate(updatedMetadata);
        break;
      case 'ArrowLeft':
        playerRef.current?.seekTo(Math.max(currentFrame - 5, 0));
        break;
      case 'ArrowRight':
        playerRef.current?.seekTo(currentFrame + 5);
        break;
      default:
        return;
    }
  }, [hotkeyMode, parsedMetadata, currentFrame, onMetadataUpdate, playerRef]);

  useEffect(() => {
    window.addEventListener('keydown', handleHotkey);
    return () => {
      window.removeEventListener('keydown', handleHotkey);
    };
  }, [handleHotkey]);

  return null;
}
