import { useEffect, useMemo, useState } from 'react';

const VOICE_STORAGE_KEY = 'jt-speech-voice-name';

const defaultVoiceName = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(VOICE_STORAGE_KEY) ?? '';
};

export const resolvePreferredVoice = (
  voices: SpeechSynthesisVoice[],
  preferredName: string,
): SpeechSynthesisVoice | undefined => {
  if (voices.length === 0) return undefined;

  if (preferredName) {
    const exact = voices.find((voice) => voice.name === preferredName);
    if (exact) return exact;
  }

  return voices.find((voice) => voice.lang.toLowerCase().startsWith('en-us')) ?? voices[0];
};

export const speakWithPreferredVoice = (
  text: string,
  preferredName: string,
  onEnd?: () => void,
): boolean => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;

  const synth = window.speechSynthesis;

  const speakNow = () => {
    const utterance = new window.SpeechSynthesisUtterance(text);
    const selected = resolvePreferredVoice(synth.getVoices(), preferredName);
    if (selected) utterance.voice = selected;
    if (onEnd) utterance.onend = onEnd;
    synth.speak(utterance);
  };

  if (synth.getVoices().length === 0) {
    const onVoicesChanged = () => {
      synth.removeEventListener('voiceschanged', onVoicesChanged);
      speakNow();
    };
    synth.addEventListener('voiceschanged', onVoicesChanged);
    return true;
  }

  speakNow();
  return true;
};

export const useSpeechVoice = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(defaultVoiceName);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const synth = window.speechSynthesis;
    const loadVoices = () => setVoices(synth.getVoices());

    loadVoices();
    synth.addEventListener('voiceschanged', loadVoices);

    return () => {
      synth.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(VOICE_STORAGE_KEY, selectedVoiceName);
  }, [selectedVoiceName]);

  const selectedVoice = useMemo(
    () => resolvePreferredVoice(voices, selectedVoiceName),
    [voices, selectedVoiceName],
  );

  return {
    voices,
    selectedVoice,
    selectedVoiceName,
    setSelectedVoiceName,
  };
};
