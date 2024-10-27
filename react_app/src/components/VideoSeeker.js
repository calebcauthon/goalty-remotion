import { useCallback } from 'react';

export function useVideoSeeker({ playerRef }, currentFrame) {
  const seekBackward = useCallback(() => {
    playerRef.current?.seekTo(Math.max(currentFrame - 5, 0));
  }, [currentFrame, playerRef]);

  const seekForward = useCallback(() => {
    playerRef.current?.seekTo(currentFrame + 5);
  }, [currentFrame, playerRef]);

  return { seekBackward, seekForward };
}
