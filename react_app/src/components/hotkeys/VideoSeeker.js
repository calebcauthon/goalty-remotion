import { useCallback } from 'react';

export function useVideoSeeker({ playerRef }, currentFrame) {
  const pauseTime = 500;
  const seekBackward = useCallback((frames = 25) => {
    const player = playerRef.current;
    const wasPlaying = player?.isPlaying();
    
    // Pause first
    player?.pause();
    
    // Perform seek
    const currentPlayerFrame = player?.getCurrentFrame();
    player?.seekTo(Math.max(currentPlayerFrame - frames, 0));
    
    // Resume if it was playing before, with delay
    if (wasPlaying) {
      setTimeout(() => {
        player?.play();
      }, pauseTime);
    }
  }, [currentFrame, playerRef]);

  const seekForward = useCallback((frames = 25) => {
    const player = playerRef.current;
    const wasPlaying = player?.isPlaying();
    
    // Pause first
    player?.pause();
    
    // Perform seek
    const currentPlayerFrame = player?.getCurrentFrame();
    player?.seekTo(currentPlayerFrame + frames);
    
    // Resume if it was playing before, with delay
    if (wasPlaying) {
      setTimeout(() => {
        player?.play();
      }, pauseTime);
    }
  }, [currentFrame, playerRef]);

  return { seekBackward, seekForward };
}
