import { useState, useRef, useCallback, useEffect } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  type?: 'text' | 'voice';
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  lastUpdated: number;
  title: string;
}

// ─── Env ────────────────────────────────────────────────────────────────────
const env = (key: string): string => {
  try { return (import.meta as any).env?.[key] ?? ''; } catch { return ''; }
};

// ─── Smart sentence splitter ─────────────────────────────────────────────────
// Avoids cutting on: Dr. / Mr. / e.g. / i.e. / U.S. / numbers like 3.5 / ellipsis
const ABBREV = /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|approx|fig|dept|est|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*$/i;
const NUM_DOT = /\d\.$/;   // "3." — probably not end of sentence
const ELLIPSIS = /\.{2,}$/; // "..." — never split

function isSentenceEnd(buf: string): boolean {
  if (!buf) return false;
  const trimmed = buf.trimEnd();
  const last = trimmed[trimmed.length - 1];
  if (!/[.!?]/.test(last)) return false;    // must end in punctuation
  if (ELLIPSIS.test(trimmed)) return false;  // ellipsis — keep going
  if (NUM_DOT.test(trimmed)) return false;   // "costed 4." — probably not done
  if (ABBREV.test(trimmed)) return false;    // abbreviation — keep going
  return true;
}

// Minimum word count before we allow a TTS flush (avoids speaking 2-word fragments)
const MIN_WORDS = 7;

function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

// ─── Volume analyser ─────────────────────────────────────────────────────────
function createVolumeAnalyser(stream: MediaStream, onVolume: (v: number) => void): () => void {
  const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return () => {};

  const ctx     = new AudioCtx();
  const source  = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);
  const data    = new Uint8Array(analyser.frequencyBinCount);
  let running   = true;

  // iOS requires resume() on user gesture
  if (ctx.state === 'suspended') ctx.resume();

  const tick = () => {
    if (!running) return;
    analyser.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    onVolume(Math.round((avg / 128) * 100));
    requestAnimationFrame(tick);
  };
  tick();

  return () => { running = false; source.disconnect(); ctx.close(); };
}

// ─── TTS fetch ───────────────────────────────────────────────────────────────
async function fetchTTSAudio(text: string): Promise<string | null> {
  const key = env('VITE_DEEPGRAM_API_KEY');
  if (!key) return null;
  try {
    const res = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en', {
      method: 'POST',
      headers: { Authorization: `Token ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    return URL.createObjectURL(await res.blob());
  } catch { return null; }
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useVoiceChat() {
  const [isConnected, setIsConnected]   = useState(false);
  const [isSpeaking, setIsSpeaking]     = useState(false);
  const [isListening, setIsListening]   = useState(false);
  const [volume, setVolume]             = useState(0);
  const [error, setError]               = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Record<string, ChatSession>>(() => {
    try {
      const raw = localStorage.getItem('voixflow_sessions_v1');
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, ChatSession>;
      
      // Migration: Ensure all legacy messages have a unique ID
      Object.values(parsed).forEach(session => {
        session.messages.forEach(msg => {
          if (!msg.id) {
            msg.id = msg.timestamp + '-' + Math.random().toString(36).substring(2, 7);
          }
        });
      });
      return parsed;
    }
    catch { return {}; }
  });

  // Refs — always fresh, no stale closures
  const recognitionRef    = useRef<any>(null);
  const audioQueueRef     = useRef<string[]>([]);
  const isPlayingRef      = useRef(false);
  const isProcessingRef   = useRef(false);
  const isConnectedRef    = useRef(false);
  const activeIdRef       = useRef<string | null>(null);
  const sessionsRef       = useRef(sessions);
  const stopVolumeRef     = useRef<(() => void) | null>(null);
  const sharedAudioRef    = useRef<HTMLAudioElement | null>(null);

  // Keep refs in sync
  useEffect(() => { activeIdRef.current = activeSessionId; }, [activeSessionId]);
  useEffect(() => { sessionsRef.current = sessions; },       [sessions]);
  useEffect(() => {
    try { localStorage.setItem('voixflow_sessions_v1', JSON.stringify(sessions)); } catch {}
  }, [sessions]);

  // Handle cleanup
  useEffect(() => {
    return () => {
      if (sharedAudioRef.current) {
        sharedAudioRef.current.pause();
        sharedAudioRef.current = null;
      }
    };
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const currentMessages = activeSessionId
    ? sessions[activeSessionId]?.messages ?? []
    : [];

  // ── Session helpers ──────────────────────────────────────────────────────────
  const genId = () => Math.random().toString(36).substring(2, 11);

  const makeSession = useCallback((title = 'New Conversation'): ChatSession => ({
    id: Math.random().toString(36).substring(2, 8).toUpperCase(),
    messages: [],
    lastUpdated: Date.now(),
    title,
  }), []);

  const ensureSession = useCallback((): string => {
    if (activeIdRef.current && sessionsRef.current[activeIdRef.current]) return activeIdRef.current;
    const s = makeSession();
    setSessions(prev => ({ ...prev, [s.id]: s }));
    setActiveSessionId(s.id);
    activeIdRef.current = s.id;
    return s.id;
  }, [makeSession]);

  // Boot: restore or create initial session
  useEffect(() => {
    if (Object.keys(sessions).length === 0) {
      const s = makeSession();
      setSessions({ [s.id]: s });
      setActiveSessionId(s.id);
    } else if (!activeSessionId) {
      const latest = Object.values(sessions).sort((a, b) => b.lastUpdated - a.lastUpdated)[0];
      setActiveSessionId(latest.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── addMessage (ref-safe, no stale closure) ─────────────────────────────────
  const addMessage = useCallback((
    role: 'user' | 'model',
    text: string,
    type: 'text' | 'voice' = 'text',
    sessionId?: string,
  ) => {
    const id = sessionId ?? activeIdRef.current;
    if (!id || !text.trim()) return;
    setSessions(prev => {
      const session = prev[id];
      if (!session) return prev;
      const msgs  = [...session.messages, { id: genId(), role, text: text.trim(), timestamp: Date.now(), type }];
      const title = session.title === 'New Conversation' || session.title === 'Voice Session'
        ? msgs.find(m => m.role === 'user')?.text.slice(0, 42) ?? session.title
        : session.title;
      return { ...prev, [id]: { ...session, messages: msgs, lastUpdated: Date.now(), title } };
    });
  }, []);

  // ── appendToLastModel: streams text into the last model message live ─────────
  // This is what makes text appear word-by-word on screen as Groq streams
  const appendToLastModel = useCallback((chunk: string, sessionId: string) => {
    setSessions(prev => {
      const session = prev[sessionId];
      if (!session) return prev;
      const msgs = [...session.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === 'model') {
        msgs[msgs.length - 1] = { ...last, text: last.text + chunk };
      } else {
        msgs.push({ id: genId(), role: 'model', text: chunk, timestamp: Date.now(), type: 'voice' });
      }
      return { ...prev, [sessionId]: { ...session, messages: msgs, lastUpdated: Date.now() } };
    });
  }, []);

  // ── Audio queue ─────────────────────────────────────────────────────────────
  const drainQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;
    setIsSpeaking(true);

    while (audioQueueRef.current.length > 0) {
      const url = audioQueueRef.current.shift()!;
      if (!sharedAudioRef.current) break;

      await new Promise<void>(resolve => {
        const audio = sharedAudioRef.current!;
        audio.src = url;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.play().catch(resolve);
      });
    }

    isPlayingRef.current = false;
    setIsSpeaking(false);

    // Resume listening once AI finishes speaking
    if (isConnectedRef.current && recognitionRef.current) {
      setIsListening(true);
      try { recognitionRef.current.start(); } catch {}
    }
  }, []);

  const stopAudio = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingRef.current  = false;
    if (sharedAudioRef.current) {
      sharedAudioRef.current.pause();
      sharedAudioRef.current.src = "";
    }
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Enqueue a sentence — fetch TTS in background, plays in order
  const enqueueSentence = useCallback(async (sentence: string) => {
    if (!sentence.trim()) return;
    const url = await fetchTTSAudio(sentence);
    if (url) {
      audioQueueRef.current.push(url);
      drainQueue();
    } else {
      // Browser fallback
      await new Promise<void>(resolve => {
        const utt  = new SpeechSynthesisUtterance(sentence);
        utt.rate   = 1.1;
        utt.onend  = () => resolve();
        utt.onerror = () => resolve();
        speechSynthesis.speak(utt);
      });
      drainQueue();
    }
  }, [drainQueue]);

  // ── Groq streaming — text appears live AND TTS fires per sentence ────────────
  const callGroq = useCallback(async (
    userText: string,
    sessionId: string,
    speakReplies: boolean,
  ) => {
    const apiKey = env('VITE_GROQ_API_KEY');
    if (!apiKey) {
      addMessage('model', 'Error: VITE_GROQ_API_KEY is not set.', 'text', sessionId);
      return;
    }

    // Snapshot history before this message
    const history = (sessionsRef.current[sessionId]?.messages ?? []).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    // Seed an empty model message so it appears immediately (for streaming)
    if (speakReplies) {
      setSessions(prev => {
        const session = prev[sessionId];
        if (!session) return prev;
        return {
          ...prev,
          [sessionId]: {
            ...session,
            messages: [
              ...session.messages,
              { id: genId(), role: 'model', text: '', timestamp: Date.now(), type: 'voice' },
            ],
            lastUpdated: Date.now(),
          },
        };
      });
    }

    let ttsBuffer  = ''; // accumulates chars for TTS sentence detection
    let fullText   = ''; // full response for saving to chat if text mode

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          stream: true,
          messages: [
            {
              role: 'system',
              content: speakReplies
                ? 'You are VoixFlow, a concise voice AI. Reply in 2–4 natural sentences. No markdown, no lists, no bullet points. Write exactly as you would speak.'
                : 'You are VoixFlow, a helpful AI assistant.',
            },
            ...history,
            { role: 'user', content: userText },
          ],
        }),
      });

      if (!res.ok || !res.body) throw new Error(`Groq ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();

      const tryFlushTTS = (final = false) => {
        if (!speakReplies) return;

        if (final) {
          // Flush whatever remains
          if (ttsBuffer.trim()) enqueueSentence(ttsBuffer.trim());
          ttsBuffer = '';
          return;
        }

        // Only flush when we have a clean sentence END + enough words
        if (isSentenceEnd(ttsBuffer) && wordCount(ttsBuffer) >= MIN_WORDS) {
          enqueueSentence(ttsBuffer.trim());
          ttsBuffer = '';
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value, { stream: true });
        for (const line of raw.split('\n')) {
          const trimmed = line.replace(/^data:\s*/, '').trim();
          if (!trimmed || trimmed === '[DONE]') continue;
          try {
            const delta = JSON.parse(trimmed)?.choices?.[0]?.delta?.content;
            if (!delta) continue;

            fullText   += delta;
            ttsBuffer  += delta;

            // ✨ Update UI live as tokens arrive
            if (speakReplies) {
              appendToLastModel(delta, sessionId);
            }

            tryFlushTTS();
          } catch { /* malformed chunk — skip */ }
        }
      }

      tryFlushTTS(true);

      // For text-only mode, save full response at end
      if (!speakReplies && fullText.trim()) {
        addMessage('model', fullText.trim(), 'text', sessionId);
      }

    } catch (err) {
      console.error('Groq stream error', err);
      setError('Failed to get AI response.');
      // Resume listening even on error
      if (speakReplies && isConnectedRef.current) {
        setIsListening(true);
        try { recognitionRef.current?.start(); } catch {}
      }
    }
  }, [addMessage, appendToLastModel, enqueueSentence]);

  // ── Connect ──────────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    try {
      // 🔊 PRIME AUDIO FOR iOS
      // This "unlocks" playback for the session during the user gesture (orb tap)
      try {
        if (!sharedAudioRef.current) {
          sharedAudioRef.current = new Audio();
          sharedAudioRef.current.preload = "auto";
        }
        
        // Play an actual quiet sound or at least a confirmed gesture speak
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') await ctx.resume();
        }

        const silent = new SpeechSynthesisUtterance(' ');
        silent.volume = 0;
        window.speechSynthesis.speak(silent);
        
        // Dummy play to unlock the shared audio element
        sharedAudioRef.current.play().catch(() => {});
      } catch {}

      setError(null);
      const sessionId = ensureSession();

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) throw new Error('Speech recognition not supported. Use Chrome or Edge.');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stopVolumeRef.current = createVolumeAnalyser(stream, setVolume);

      const recognition = new SpeechRecognition();
      recognition.continuous     = false;
      recognition.interimResults = false;
      recognition.lang           = 'en-US';
      recognitionRef.current     = recognition;

      recognition.onstart = () => {
        setIsConnected(true);
        setIsListening(true);
        isConnectedRef.current = true;
      };

      recognition.onresult = async (event: any) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        const transcript: string =
          event.results[event.results.length - 1][0].transcript.trim();
        if (!transcript) { isProcessingRef.current = false; return; }

        stopAudio();
        setIsListening(false);
        addMessage('user', transcript, 'voice', sessionId);

        await callGroq(transcript, sessionId, true);
        isProcessingRef.current = false;
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          if (isConnectedRef.current && !isPlayingRef.current) {
            try { recognition.start(); } catch {}
          }
          return;
        }
        setError(`Mic error: ${event.error}`);
      };

      recognition.onend = () => {
        if (isConnectedRef.current && !isPlayingRef.current && !isProcessingRef.current) {
          try { recognition.start(); } catch {}
        }
      };

      recognition.start();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start voice');
      disconnect();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Disconnect — saves session and opens a fresh one ─────────────────────────
  const disconnect = useCallback(() => {
    isConnectedRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    stopVolumeRef.current?.();
    stopVolumeRef.current  = null;
    stopAudio();
    setIsConnected(false);
    setIsListening(false);
    setVolume(0);
    isProcessingRef.current = false;

    // Auto-create a new blank session so the screen clears
    const s = {
      id: Math.random().toString(36).substring(2, 8).toUpperCase(),
      messages: [],
      lastUpdated: Date.now(),
      title: 'New Conversation',
    };
    setSessions(prev => ({ ...prev, [s.id]: s }));
    setActiveSessionId(s.id);
    activeIdRef.current = s.id;
  }, [stopAudio]);

  useEffect(() => () => { disconnect(); }, [disconnect]);

  // ── Text send ────────────────────────────────────────────────────────────────
  const sendTextMessage = useCallback(async (text: string) => {
    const sessionId = ensureSession();
    addMessage('user', text, 'text', sessionId);
    await callGroq(text, sessionId, false);
  }, [ensureSession, addMessage, callGroq]);

  // ── Session management ────────────────────────────────────────────────────────
  const startNewSession = useCallback(() => {
    const s = makeSession();
    setSessions(prev => ({ ...prev, [s.id]: s }));
    setActiveSessionId(s.id);
  }, [makeSession]);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => { const n = { ...prev }; delete n[id]; return n; });
    if (activeSessionId === id) {
      const remaining = Object.values(sessionsRef.current).filter(s => s.id !== id);
      if (remaining.length > 0) {
        const latest = remaining.sort((a, b) => b.lastUpdated - a.lastUpdated)[0];
        setActiveSessionId(latest.id);
      } else {
        const s = makeSession();
        setSessions(prev => ({ ...prev, [s.id]: s }));
        setActiveSessionId(s.id);
      }
    }
  }, [activeSessionId, makeSession]);

  const clearHistory = useCallback(() => {
    setSessions({});
    setActiveSessionId(null);
    try { localStorage.removeItem('voixflow_sessions_v1'); } catch {}
  }, []);

  return {
    isConnected, isSpeaking, isListening, volume, error,
    sessions: Object.values(sessions).sort((a, b) => b.lastUpdated - a.lastUpdated),
    activeSessionId, setActiveSessionId,
    currentMessages,
    connect, disconnect,
    sendTextMessage,
    startNewSession, deleteSession, clearHistory,
  };
}
