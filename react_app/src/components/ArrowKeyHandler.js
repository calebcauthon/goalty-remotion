import { useCallback, useEffect } from 'react';

export function useArrowKeys(hotkeyMode, currentFrame, playerRef) {
  const handleArrowKeys = useCallback((event) => {
    if (!hotkeyMode) return;

    switch (event.key) {
      case 'ArrowLeft':
        playerRef.current?.seekTo(Math.max(currentFrame - 5, 0));
        break;
      case 'ArrowRight':
        playerRef.current?.seekTo(currentFrame + 5);
        break;
      default:
        return;
    }
  }, [hotkeyMode, currentFrame, playerRef]);

  useEffect(() => {
    window.addEventListener('keydown', handleArrowKeys);
    return () => {
      window.removeEventListener('keydown', handleArrowKeys);
    };
  }, [handleArrowKeys]);

  return null;
}
