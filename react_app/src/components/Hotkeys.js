import { useCallback, useEffect } from 'react';

export function useHotkeys(hotkeyMode, parsedMetadata, currentFrame, onMetadataUpdate) {
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
      default:
        return;
    }
  }, [hotkeyMode, parsedMetadata, currentFrame, onMetadataUpdate]);

  useEffect(() => {
    window.addEventListener('keydown', handleHotkey);
    return () => {
      window.removeEventListener('keydown', handleHotkey);
    };
  }, [handleHotkey]);

  return null;
}
