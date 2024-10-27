import { useCallback, useEffect, useMemo } from 'react';
import { useTagAdder } from './TagAdder';
import { useVideoSeeker } from './VideoSeeker';

export function useHotkeys(hotkeyMode, playerTools, currentFrame) {
  const addTag = useTagAdder(playerTools, currentFrame);
  const { seekBackward, seekForward } = useVideoSeeker(playerTools, currentFrame);

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
