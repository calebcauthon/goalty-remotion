import { useCallback } from 'react';

const SPEED_MULTIPLIER = 1.5;
const MIN_SPEED = 0.25;
const MAX_SPEED = 4;

export function useSpeedController({ getPlaybackRate, setPlaybackRate }) {
  const speedUp = useCallback(() => {
    const currentSpeed = getPlaybackRate();
    const newSpeed = Math.min(currentSpeed * SPEED_MULTIPLIER, MAX_SPEED);
    setPlaybackRate(newSpeed);
  }, [getPlaybackRate, setPlaybackRate]);

  const slowDown = useCallback(() => {
    const currentSpeed = getPlaybackRate();
    const newSpeed = Math.max(currentSpeed / SPEED_MULTIPLIER, MIN_SPEED);
    setPlaybackRate(newSpeed);
  }, [getPlaybackRate, setPlaybackRate]);

  const resetSpeed = useCallback(() => {
    setPlaybackRate(1);
  }, [setPlaybackRate]);

  return { speedUp, slowDown, resetSpeed };
}
