import { useCallback, useRef, useEffect, useState } from 'react';

export function useRangeBuilder({ playerRef }, currentFrame) {
  const rangeRef = useRef({ min: Infinity, max: -Infinity });
  const [enforceRange, setEnforceRange] = useState(true);

  const markFrame = useCallback(() => {
    const player = playerRef.current;
    const currentPlayerFrame = player?.getCurrentFrame();
    
    // Enable enforcement when marking new frame
    setEnforceRange(true);
    
    if (currentPlayerFrame < rangeRef.current.min) {
      rangeRef.current.min = currentPlayerFrame;
    }
    if (currentPlayerFrame > rangeRef.current.max) {
      rangeRef.current.max = currentPlayerFrame;
    }
    
    console.log(`🎯 Marked frame: ${currentPlayerFrame} 📍`);
    console.log(`📏 Range: ${rangeRef.current.min} → ${rangeRef.current.max}`);
  }, [playerRef]);

  const breakRange = useCallback(() => {
    setEnforceRange(false);
    rangeRef.current = { min: Infinity, max: -Infinity };
    console.log('🔓 Range cleared and disabled');
  }, []);

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

  return { markFrame, breakRange };
} 