import { useCallback } from 'react';

export function usePlayPauseController({ playerRef }) {
  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    
    console.log('isPlaying', playerRef.current.isPlaying());
    if (playerRef.current.isPlaying()) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
  }, [playerRef]);

  return { togglePlayPause };
}
