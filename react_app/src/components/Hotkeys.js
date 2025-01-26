import { useCallback, useEffect, useState, useRef } from 'react';
import { useTagAdder } from './hotkeys/TagAdder';
import { useVideoSeeker } from './hotkeys/VideoSeeker';
import { useHighlightAdder } from './hotkeys/HighlightAdder';
import { useSpeedController } from './hotkeys/SpeedController';
import { usePlayPauseController } from './hotkeys/PlayPauseController';
import { useRangeBuilder } from './hotkeys/RangeBuilder';

export function useHotkeys(hotkeyMode, playerTools, currentFrame, initialHotkeys) {
  playerTools.registerHotkey = (...args) => { return registerHotkey(...args) };
  playerTools.unregisterHotkey = (...args) => { return unregisterHotkey(...args) };
  playerTools.registerTemporaryHotkey = (...args) => { return registerTemporaryHotkey(...args) };
  playerTools.clearTemporaryHotkeys = (...args) => { return clearTemporaryHotkeys(...args) };
  playerTools.clearUnregisteredHotkeys = (...args) => { return clearUnregisteredHotkeys(...args) };

//  const addTag = useTagAdder(playerTools, currentFrame);
//  const { seekBackward, seekForward } = useVideoSeeker(playerTools, currentFrame);
//  const addHighlight = useHighlightAdder(playerTools, currentFrame);
//  const { slowDown, speedUp, resetSpeed } = useSpeedController(playerTools);
//  const { togglePlayPause } = usePlayPauseController(playerTools);
  const { markFrame, breakRange } = useRangeBuilder(playerTools, currentFrame);

  const [hotkeyMap, setHotkeyMap] = useState(initialHotkeys);

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
      console.log(`Executing action for hotkey ${event.key}`);
      action();
    } else {
      console.log(`No action for hotkey ${event.key}, key code ${event.code}`);
    }
  }, [hotkeyMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleHotkey);
    return () => {
      window.removeEventListener('keydown', handleHotkey);
    };
  }, [handleHotkey]);

  const setHotkeys = useCallback((newHotkeys) => {
    setHotkeyMap(newHotkeys);
    hotkeyMapRef.current = newHotkeys;
    // Clear temporary and unregistered hotkeys when setting new hotkeys
    clearTemporaryHotkeys();
    clearUnregisteredHotkeys();
  }, [clearTemporaryHotkeys, clearUnregisteredHotkeys]);

  useEffect(() => {
    registerHotkey('m', markFrame);
    registerHotkey('b', breakRange);
  }, [markFrame, breakRange, registerHotkey]);

  return { 
    registerHotkey, 
    unregisterHotkey, 
    registerTemporaryHotkey, 
    clearTemporaryHotkeys, 
    clearUnregisteredHotkeys,
    setHotkeys,
  };
}
