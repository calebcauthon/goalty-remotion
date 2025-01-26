import { useCallback, useRef, useEffect, useState } from 'react';

export function useRangeBuilder({ playerRef }, currentFrame) {
  const rangeRef = useRef({ min: Infinity, max: -Infinity });
  const [enforceRange, setEnforceRange] = useState(true);
  const [ranges, setRanges] = useState([]);

  const markFrame = useCallback(() => {
    const player = playerRef.current;
    const currentPlayerFrame = player?.getCurrentFrame();
    
    setEnforceRange(true);
    
    if (currentPlayerFrame < rangeRef.current.min) {
      rangeRef.current.min = currentPlayerFrame;
    }
    if (currentPlayerFrame > rangeRef.current.max) {
      rangeRef.current.max = currentPlayerFrame;
    }
    
    // Add to ranges list if it's a new range
    if (rangeRef.current.min !== Infinity && rangeRef.current.max !== -Infinity) {
      setRanges(prev => {
        const newRange = {
          min: rangeRef.current.min,
          max: rangeRef.current.max,
          id: Date.now(),
          active: true
        };
        return [...prev.filter(r => !r.active), newRange];
      });
    }
    
    console.log(`🎯 Marked frame: ${currentPlayerFrame} 📍`);
    console.log(`📏 Range: ${rangeRef.current.min} → ${rangeRef.current.max}`);
  }, [playerRef]);

  const breakRange = useCallback(() => {
    setEnforceRange(false);
    // Mark current range as inactive but keep it in history
    setRanges(prev => prev.map(range => ({
      ...range,
      active: false
    })));
    // Reset current range
    rangeRef.current = { min: Infinity, max: -Infinity };
    console.log('🔓 Range cleared and disabled');
  }, []);

  const enforceRangeById = useCallback((rangeToEnforce) => {
    setEnforceRange(true);
    rangeRef.current = { min: rangeToEnforce.min, max: rangeToEnforce.max };
    
    setRanges(prev => prev.map(range => ({
      ...range,
      active: range.id === rangeToEnforce.id
    })));

    // Seek to start of range
    playerRef.current?.seekTo(rangeToEnforce.min);
    console.log(`🔒 Enforcing range: ${rangeToEnforce.min} → ${rangeToEnforce.max}`);
  }, [playerRef]);

  useEffect(() => {
    if (!enforceRange) return;
    
    const player = playerRef.current;
    if (!player || rangeRef.current.min === Infinity) return;

    const currentPlayerFrame = player.getCurrentFrame();
    
    if (currentPlayerFrame < rangeRef.current.min) {
      console.log(`🔄 Frame ${currentPlayerFrame} outside range, seeking to min: ${rangeRef.current.min}`);
      player.seekTo(rangeRef.current.min);
    } else if (currentPlayerFrame > rangeRef.current.max + 15) {
      console.log(`🔄 Frame ${currentPlayerFrame} outside range, seeking to min: ${rangeRef.current.min}`);
      player.seekTo(rangeRef.current.min);
    }
  }, [currentFrame, playerRef, enforceRange]);

  return { markFrame, breakRange, enforceRangeById, ranges };
} 