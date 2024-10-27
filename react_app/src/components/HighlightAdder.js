import { useCallback } from 'react';

export function useHighlightAdder({ updateMetadata, playerRef, registerTemporaryHotkey, clearTemporaryHotkeys }, currentFrame) {
  return useCallback(() => {
    const { speed, frames } = { speed: 250, frames: 3 };
    playerRef.current?.pause();
    const originalFrame = playerRef.current?.getCurrentFrame();
    let intervalId;
    let isRewinding = true;

    const rewindThenForward = () => {
      if (isRewinding) {
        const currentPlayerFrame = playerRef.current?.getCurrentFrame();
        playerRef.current?.seekTo(currentPlayerFrame - frames);
      } else {
        const currentPlayerFrame = playerRef.current?.getCurrentFrame();
        playerRef.current?.seekTo(currentPlayerFrame + frames);
      }
    };

    intervalId = setInterval(rewindThenForward, speed);

    registerTemporaryHotkey('g', () => {
      clearInterval(intervalId);
      addTag('highlight start', playerRef.current?.getCurrentFrame());

      playerRef.current?.seekTo(originalFrame);
      isRewinding = false;
      intervalId = setInterval(rewindThenForward, speed);
    });

    registerTemporaryHotkey('h', () => {
      clearInterval(intervalId);
      addTag('highlight end', playerRef.current?.getCurrentFrame());

      clearTemporaryHotkeys();
      playerRef.current?.play();
    });

    function addTag(name, frame) {
      updateMetadata(prevMetadata => {
        const updatedMetadata = { ...prevMetadata };
        if (!updatedMetadata.tags) {
          updatedMetadata.tags = [];
        }
        updatedMetadata.tags.push({ name, frame });
        return updatedMetadata;
      });
    }

  }, [updateMetadata, currentFrame, playerRef, registerTemporaryHotkey, clearTemporaryHotkeys]);
}
