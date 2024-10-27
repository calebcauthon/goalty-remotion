import { useCallback } from 'react';

export function useVideoSeeker({ playerRef }, currentFrame) {
  const seekBackward = useCallback(() => {
    const currentPlayerFrame = playerRef.current?.getCurrentFrame();
    playerRef.current?.seekTo(Math.max(currentPlayerFrame - 5, 0));
  }, [currentFrame, playerRef]);

  const seekForward = useCallback(() => {
    const currentPlayerFrame = playerRef.current?.getCurrentFrame();
    playerRef.current?.seekTo(currentPlayerFrame + 5);
  }, [currentFrame, playerRef]);

  return { seekBackward, seekForward };
}
