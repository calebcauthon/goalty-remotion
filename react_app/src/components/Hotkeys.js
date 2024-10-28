import { useCallback, useEffect, useState, useRef } from 'react';
import { useTagAdder } from './hotkeys/TagAdder';
import { useVideoSeeker } from './hotkeys/VideoSeeker';
import { useHighlightAdder } from './hotkeys/HighlightAdder';
import { useSpeedController } from './hotkeys/SpeedController';

export const hotkeyDescriptions = {
  '1': 'Add game start tag',
  '9': 'Add game end tag',
  'ArrowLeft': 'Move back 5 frames',
  'ArrowRight': 'Move forward 5 frames',
  'h': 'Add highlight tag and pause video',
  ',': 'Slow down video',
  '.': 'Speed up video',
  ';': 'Reset video speed to 1x',
};

export function useHotkeys(hotkeyMode, playerTools, currentFrame) {
  playerTools.registerHotkey = (...args) => { return registerHotkey(...args) };
  playerTools.unregisterHotkey = (...args) => { return unregisterHotkey(...args) };
  playerTools.registerTemporaryHotkey = (...args) => { return registerTemporaryHotkey(...args) };
  playerTools.clearTemporaryHotkeys = (...args) => { return clearTemporaryHotkeys(...args) };
  playerTools.clearUnregisteredHotkeys = (...args) => { return clearUnregisteredHotkeys(...args) };

  const addTag = useTagAdder(playerTools, currentFrame);
  const { seekBackward, seekForward } = useVideoSeeker(playerTools, currentFrame);
  const addHighlight = useHighlightAdder(playerTools, currentFrame);
  const { slowDown, speedUp, resetSpeed } = useSpeedController(playerTools);

  const [hotkeyMap, setHotkeyMap] = useState({
    '1': () => addTag('game_start'),
    '9': () => addTag('game_end'),
    'ArrowLeft': seekBackward,
    'ArrowRight': seekForward,
    'h': addHighlight,
    ',': slowDown,
    '.': speedUp,
    ';': resetSpeed,
  });

  const [unregisteredHotkeys, setUnregisteredHotkeys] = useState({});
  const [temporaryHotkeys, setTemporaryHotkeys] = useState({});

  const hotkeyMapRef = useRef(hotkeyMap);
  const unregisteredHotkeysRef = useRef(unregisteredHotkeys);
  const temporaryHotkeysRef = useRef(temporaryHotkeys);

  const registerHotkey = useCallback((key, action) => {
    setHotkeyMap(prevMap => {
      const newMap = {
        ...prevMap,
        [key]: action
      };
      hotkeyMapRef.current = newMap;
      return newMap;
    });
    
    // Remove from unregistered hotkeys if it was there
    setUnregisteredHotkeys(prevUnregistered => {
      const { [key]: _, ...newUnregistered } = prevUnregistered;
      unregisteredHotkeysRef.current = newUnregistered;
      return newUnregistered;
    });
  }, []);

  const unregisterHotkey = useCallback((key) => {
    setUnregisteredHotkeys(prevUnregistered => {
      const newUnregistered = {
        ...prevUnregistered,
        [key]: true
      };
      unregisteredHotkeysRef.current = newUnregistered;
      return newUnregistered;
    });
  }, []);

  const registerTemporaryHotkey = useCallback((key, action) => {
    setTemporaryHotkeys(prevTemp => {
      const newTemp = {
        ...prevTemp,
        [key]: action
      };
      temporaryHotkeysRef.current = newTemp;
      return newTemp;
    });
  }, []);

  const clearTemporaryHotkeys = useCallback(() => {
    setTemporaryHotkeys({});
    temporaryHotkeysRef.current = {};
  }, []);

  const clearUnregisteredHotkeys = useCallback(() => {
    setUnregisteredHotkeys({});
    unregisteredHotkeysRef.current = {};
  }, []);

  const handleHotkey = useCallback((event) => {
    if (!hotkeyMode) return;
    if (unregisteredHotkeysRef.current[event.key]) return;
    
    const temporaryAction = temporaryHotkeysRef.current[event.key];
    if (temporaryAction) {
      temporaryAction();
      return;
    }
    
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

  return { 
    registerHotkey, 
    unregisterHotkey, 
    registerTemporaryHotkey, 
    clearTemporaryHotkeys, 
    clearUnregisteredHotkeys,
    hotkeyDescriptions 
  };
}
