import { useCallback, useEffect, useMemo } from 'react';

export function useHotkeys(hotkeyMode, { parsedMetadata, playerRef, onMetadataUpdate }, currentFrame) {
  const addTag = useCallback((tagName) => {
    const updatedMetadata = { ...parsedMetadata };
    if (!updatedMetadata.tags) {
      updatedMetadata.tags = [];
    }
    updatedMetadata.tags.push({ name: tagName, frame: currentFrame });
    onMetadataUpdate(updatedMetadata);
  }, [parsedMetadata, currentFrame, onMetadataUpdate]);

  const seekBackward = useCallback(() => {
    playerRef.current?.seekTo(Math.max(currentFrame - 5, 0));
  }, [currentFrame, playerRef]);

  const seekForward = useCallback(() => {
    playerRef.current?.seekTo(currentFrame + 5);
  }, [currentFrame, playerRef]);

  const hotkeyMap = useMemo(() => ({
    '1': () => addTag('game_start'),
    '9': () => addTag('game_end'),
    'ArrowLeft': seekBackward,
    'ArrowRight': seekForward,
  }), [addTag, seekBackward, seekForward]);

  const registerHotkey = useCallback((key, action) => {
    hotkeyMap[key] = action;
  }, [hotkeyMap]);

  const handleHotkey = useCallback((event) => {
    if (!hotkeyMode) return;
    const action = hotkeyMap[event.key];
    if (action) {
      action();
    }
  }, [hotkeyMode, hotkeyMap]);

  useEffect(() => {
    window.addEventListener('keydown', handleHotkey);
    return () => {
      window.removeEventListener('keydown', handleHotkey);
    };
  }, [handleHotkey]);

  return { registerHotkey };
}
