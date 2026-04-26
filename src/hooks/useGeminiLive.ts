import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { arrayBufferToBase64, base64ToArrayBuffer, float32ToInt16, int16ToFloat32 } from '../lib/audio-utils';

export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [transcription, setTranscription] = useState<string>("");
  const [latestResponse, setLatestResponse] = useState<string>("");
  const [sentiment, setSentiment] = useState<number>(60); // 0-100
  const [visionStatus, setVisionStatus] = useState<string>("Standby");

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null); // LiveSession type from SDK
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  const cleanup = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.then((s: any) => s.close());
      sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    setVolume(0);
  }, []);

  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0 || isPlayingRef.current) return;
    
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    isPlayingRef.current = true;
    setIsSpeaking(true);

    const chunk = audioQueueRef.current.shift()!;
    const buffer = audioContext.createBuffer(1, chunk.length, 24000);
    buffer.getChannelData(0).set(chunk);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    
    // Simple volume analysis for visualizer
    const analyzer = audioContext.createAnalyser();
    source.connect(analyzer);
    
    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    const updateVolume = () => {
      if (!isPlayingRef.current) return;
      analyzer.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setVolume(average * 2); 
      requestAnimationFrame(updateVolume);
    };
    updateVolume();

    source.onended = () => {
      isPlayingRef.current = false;
      if (audioQueueRef.current.length === 0) {
        setIsSpeaking(false);
        setVolume(0);
      } else {
        playNextInQueue();
      }
    };
    source.start();
  }, []);

  const connect = useCallback(async () => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

      const ai = new GoogleGenAI({ apiKey });
      
      // Request microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are AURA, a high-end professional AI assistant. You speak with confidence and clarity. You can see through the camera or screen sharing. Keep responses concise and natural.",
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            source.connect(processor);
            processor.connect(audioContext.destination);
            
            processor.onaudioprocess = (e) => {
              if (isPlayingRef.current) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmData = float32ToInt16(inputData);
              const base64Data = arrayBufferToBase64(pcmData);
              
              sessionPromise.then((s) => s.sendRealtimeInput({
                audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
              }));
              
              // Visualizer logic for input
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += Math.abs(inputData[i]);
              const vol = sum / inputData.length * 500;
              setVolume(vol);
              setIsListening(vol > 5);
              if (vol > 10) setSentiment(prev => Math.min(100, Math.max(0, prev + (Math.random() * 2 - 1))));
            };
          },
          onmessage: async (message) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const pcmBuffer = base64ToArrayBuffer(base64Audio);
              const float32Data = int16ToFloat32(new Int16Array(pcmBuffer));
              audioQueueRef.current.push(float32Data);
              playNextInQueue();
            }

            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              setIsSpeaking(false);
            }

            const textPart = message.serverContent?.modelTurn?.parts?.find(p => p.text);
            if (textPart?.text) {
              setLatestResponse(prev => prev + textPart.text);
              setTranscription(textPart.text || "");
            }
          },
          onclose: () => cleanup(),
          onerror: (err) => console.error("Live Session Error:", err),
        }
      });

      sessionRef.current = sessionPromise;
    } catch (err) {
      console.error("Failed to connect to Gemini Live:", err);
      cleanup();
    }
  }, [cleanup, playNextInQueue]);

  const sendVideoFrame = useCallback((base64Data: string) => {
    if (sessionRef.current) {
      sessionRef.current.then((s: any) => s.sendRealtimeInput({
        video: { data: base64Data, mimeType: 'image/jpeg' }
      }));
      setVisionStatus("Active HUD");
    }
  }, []);

  return {
    isConnected,
    isSpeaking,
    isListening,
    volume,
    transcription,
    latestResponse,
    sentiment,
    visionStatus,
    connect,
    disconnect: cleanup,
    sendVideoFrame
  };
}
