import { useCallback } from 'react';

export function useVideoSeeker({ playerRef }, currentFrame) {
  const seekBackward = useCallback((frames = 25) => {
    const currentPlayerFrame = playerRef.current?.getCurrentFrame();
    playerRef.current?.seekTo(Math.max(currentPlayerFrame - frames, 0));
  }, [currentFrame, playerRef]);

  const seekForward = useCallback((frames = 25) => {
    const currentPlayerFrame = playerRef.current?.getCurrentFrame();
    playerRef.current?.seekTo(currentPlayerFrame + frames);
  }, [currentFrame, playerRef]);

  return { seekBackward, seekForward };
}
