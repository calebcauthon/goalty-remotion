import { useCallback, useRef, useState, useContext, useEffect } from 'react';
import axios from 'axios';

export function useAutoListen({ playerRef, GlobalContext }, currentFrame) {
  const recognition = useRef(null);
  const [isAutoListening, setIsAutoListening] = useState(false);
  const [autoTranscript, setAutoTranscript] = useState('');
  const [startFrameForAuto, setStartFrameForAuto] = useState(0);
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [autoNotes, setAutoNotes] = useState('');
  const silenceTimer = useRef(null);
  const lastTranscriptTime = useRef(Date.now());

  if (!GlobalContext) {
    GlobalContext = {
      APIbaseUrl: 'http://localhost:8000'
    }
  }
  const globalData = useContext(GlobalContext);

  const processAndSaveTags = useCallback(async () => {
    setIsAutoProcessing(true);
    try {
      // First process the transcript
      const processResponse = await axios.post(`${globalData.APIbaseUrl}/api/videos/process-dictation`, {
        dictation: autoTranscript,
        frame: startFrameForAuto,
        instructions: autoNotes
      });

      // Then immediately save the tags
      await axios.post(`${globalData.APIbaseUrl}/api/videos/save-tags`, {
        analysis: processResponse.data.analysis,
        frame: startFrameForAuto
      });

      console.log('🎤 Auto-processed and saved:', processResponse.data.analysis);
    } catch (error) {
      console.error('Error in auto-process:', error);
    }
    setIsAutoProcessing(false);
    setAutoTranscript('');
  }, [autoTranscript, startFrameForAuto, globalData.APIbaseUrl]);

  const startAutoListening = useCallback(() => {
    if (!recognition.current) {
      recognition.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      
      recognition.current.onresult = (event) => {
        const text = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setAutoTranscript(text);
        lastTranscriptTime.current = Date.now();
        
        // Clear and reset silence timer
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
        console.log('⏲️ Auto-transcript timer cleared and started!');
        silenceTimer.current = setTimeout(() => {
          console.log('⏲️ Auto-transcript timer triggered!');
          if (text.trim()) {
            console.log('🎤 Auto-transcript timer triggered, part 2!');
            stopAutoListening();
          }
        }, 1500);
      };
    }

    setAutoTranscript('');
    recognition.current.start();
    setIsAutoListening(true);
    console.log('🎤 Started auto-listening at frame:', startFrameForAuto);
  });

  const stopAutoListening = useCallback(() => {
    // GOT HERE WHY NOT KEEP GOING
    if (recognition.current) {
      recognition.current.stop();
      setIsAutoListening(false);
      if (autoTranscript.trim()) {
        console.log('🎤 Auto-transcript start processing!');
        processAndSaveTags();
      }
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current);
      }
    }
  }, [autoTranscript, processAndSaveTags]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current);
      }
      if (recognition.current) {
        recognition.current.stop();
      }
    };
  }, []);

  return {
    startAutoListening,
    stopAutoListening,
    isAutoListening,
    autoTranscript,
    isAutoProcessing,
    setStartFrameForAuto,
    setAutoNotes
  };
} 