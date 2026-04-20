import { useState, useRef } from 'react';

interface VoiceRecognitionResult {
  transcript: string;
  isListening: boolean;
  error: string | null;
  start: () => void;
  stop: () => void;
}

export function useVoiceRecognition(): VoiceRecognitionResult {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const start = () => {
    console.log('[useVoiceRecognition] start() called');
    setTranscript('');
    setError(null);
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser.');
      console.error('[useVoiceRecognition] Speech recognition not supported in this browser.');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('SpeechRecognition constructor not found.');
      console.error('[useVoiceRecognition] SpeechRecognition constructor not found.');
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event: any) => {
        console.log('[useVoiceRecognition] onresult:', event.results[0][0].transcript);
        setTranscript(event.results[0][0].transcript);
        setIsListening(false);
      };
      recognition.onerror = (event: any) => {
        if (event.error === 'aborted') {
          // Ignore aborted errors, which are expected when stopping for speech synthesis
          console.warn('[useVoiceRecognition] onerror: aborted (ignored)');
          setIsListening(false);
          return;
        }
        setError(event.error || 'Speech recognition error');
        setIsListening(false);
        console.error('[useVoiceRecognition] onerror:', event.error);
      };
      recognition.onend = () => {
        setIsListening(false);
        console.log('[useVoiceRecognition] onend');
      };
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      console.log('[useVoiceRecognition] recognition started');
    } catch (err) {
      setError('Failed to start recognition: ' + err);
      setIsListening(false);
      console.error('[useVoiceRecognition] Failed to start recognition:', err);
    }
  };

  const stop = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return { transcript, isListening, error, start, stop };
}
