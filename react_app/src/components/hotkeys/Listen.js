import { useCallback, useRef, useState, useContext, useEffect } from 'react';
import axios from 'axios';

export function useListen(GlobalContext) {
  const recognition = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFrame, setDictationCurrentFrame] = useState(0);
  const [notes, setNotes] = useState('');

  if (!GlobalContext) { 
    GlobalContext = {
      APIbaseUrl: 'http://localhost:8000'
    }
  }
  const globalData = useContext(GlobalContext);

  useEffect(() => {
    console.log('🎤 Notes:', notes);
  }, [notes]);

  const startListening = useCallback(() => {
    if (!recognition.current) {
      recognition.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      
      recognition.current.onresult = (event) => {
        const text = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setTranscript(text);
        console.log('🎤 Transcript:', text);
      };
    }

    setTranscript('');
    setAnalysis('');
    recognition.current.start();
    setIsListening(true);
    console.log('🎤 Started listening');
  }, []);

  const transcriptRef = useRef(transcript);
  const notesRef = useRef(notes);
  const currentFrameRef = useRef(currentFrame);

  useEffect(() => {
    transcriptRef.current = transcript;
    notesRef.current = notes;
    currentFrameRef.current = currentFrame;
  }, [transcript, notes, currentFrame]);


  const processTranscript = useCallback(async () => {
    setIsProcessing(true);
    const currentTranscript = transcriptRef.current;
    const currentNotes = notesRef.current;
    const currentFrame = currentFrameRef.current;
    try {
      const response = await axios.post(`${globalData.APIbaseUrl}/api/videos/process-dictation`, {
        dictation: currentTranscript,
        notes: currentNotes,
        frame: currentFrame
      });
      setAnalysis(response.data.analysis);
    } catch (error) {
      console.error('Error processing dictation:', error);
      setAnalysis('Error processing dictation');
    }
    setIsProcessing(false);
  }, [transcript, notes, currentFrame]);

  const stopListening = useCallback(() => {
    if (recognition.current) {
      recognition.current.stop();
      setIsListening(false);
      processTranscript();
      console.log('🎤 Stopped listening, transcript:', transcript);
    }
  }, []);



  return { 
    startListening, 
    stopListening, 
    isListening, 
    transcript, 
    analysis,
    isProcessing,
    processTranscript,
    setDictationCurrentFrame,
    setNotes
  };
} 