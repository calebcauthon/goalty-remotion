import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useTagAdder } from './TagAdder';
import { useVideoSeeker } from './VideoSeeker';
import { useHighlightAdder } from './HighlightAdder';

export const hotkeyDescriptions = {
  '1': 'Add game start tag',
  '9': 'Add game end tag',
  'ArrowLeft': 'Move back 5 frames',
  'ArrowRight': 'Move forward 5 frames',
  'h': 'Add highlight tag and pause video',
};

export function useHotkeys(hotkeyMode, playerTools, currentFrame) {
  playerTools.registerHotkey = (...args) => { return registerHotkey(...args) };

  const addTag = useTagAdder(playerTools, currentFrame);
  const { seekBackward, seekForward } = useVideoSeeker(playerTools, currentFrame);
  const addHighlight = useHighlightAdder(playerTools, currentFrame);

  const [hotkeyMap, setHotkeyMap] = useState({
    '1': () => addTag('game_start'),
    '9': () => addTag('game_end'),
    'ArrowLeft': seekBackward,
    'ArrowRight': seekForward,
    'h': addHighlight,
  });

  const hotkeyMapRef = useRef(hotkeyMap);

  const registerHotkey = useCallback((key, action) => {
    setHotkeyMap(prevMap => {
      const newMap = {
        ...prevMap,
        [key]: action
      };
      hotkeyMapRef.current = newMap;
      return newMap;
    });
  }, []);

  const handleHotkey = useCallback((event) => {
    if (!hotkeyMode) return;
    const action = hotkeyMapRef.current[event.key];
    if (action) {
      action();
    }
  }, [hotkeyMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleHotkey);
    return () => {
      window.removeEventListener('keydown', handleHotkey);
    };
  }, [handleHotkey]);

  return { registerHotkey, hotkeyDescriptions };
}
