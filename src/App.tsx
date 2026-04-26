import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  PhoneOff,
  Maximize2,
  Settings
} from 'lucide-react';
import { AudioOrb } from './components/AudioOrb';
import { useGeminiLive } from './hooks/useGeminiLive';

export default function App() {
  const { 
    isConnected, 
    isSpeaking, 
    isListening, 
    volume, 
    connect, 
    disconnect 
  } = useGeminiLive();

  return (
    <div className="flex bg-[#050505] min-h-screen text-white/90 selection:bg-indigo-500/30 overflow-hidden items-center justify-center p-6">
      <div className="atmosphere" />
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-indigo-500/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-emerald-500/5 blur-[120px] rounded-full animate-pulse" />
      </div>

      <main className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg">
        {/* Connection Status Label */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex flex-col items-center gap-2"
        >
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/20'}`} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
              {isConnected ? 'Neural Bridge Active' : 'Neural Standby'}
            </span>
          </div>
        </motion.div>

        {/* Central Orb Segment */}
        <div
          className="relative group cursor-pointer"
          onClick={isConnected ? disconnect : connect}
        >
          <AudioOrb 
            isListening={isListening} 
            isSpeaking={isSpeaking} 
            volume={volume} 
          />
        </div>

        {/* Dynamic Transcription / Label */}
        <div className="mt-16 text-center h-20 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {!isConnected ? (
              <motion.div
                key="standby"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-2"
              >
                <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
                  AURA Voice Interface
                </h1>
                <p className="text-sm text-white/30 font-medium tracking-wide italic">
                  Tap the orb to initialize dialogue
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="active"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col gap-2"
              >
                <p className="text-lg font-light text-white/80 transition-all duration-500 italic">
                  {isSpeaking
                    ? "Analyzing resonance..."
                    : isListening
                    ? "Listening for intent..."
                    : "Session established."}
                </p>
                <div className="flex justify-center gap-1.5 mt-2 h-1 overflow-hidden w-40 mx-auto">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-all duration-300 ${
                        isConnected ? 'bg-emerald-500/30' : 'bg-white/5'
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Minimal Control Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 flex items-center gap-4 bg-white/[0.03] backdrop-blur-3xl border border-white/5 p-4 rounded-[2.5rem] shadow-2xl"
        >
          <button 
            onClick={isConnected ? disconnect : connect}
            className={`h-14 w-14 rounded-full flex items-center justify-center transition-all ${
              isConnected
                ? 'bg-white text-black shadow-lg shadow-white/10'
                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
            }`}
          >
            {isConnected ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <div className="w-px h-8 bg-white/10 mx-2" />

          <button className="h-14 w-14 rounded-full bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center">
            <Settings className="w-6 h-6" />
          </button>
          
          <button 
            onClick={disconnect}
            disabled={!isConnected}
            className={`h-14 w-14 rounded-full flex items-center justify-center transition-all ${
              isConnected
                ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20'
                : 'bg-white/5 text-white/10 cursor-not-allowed'
            }`}
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </motion.div>

        {/* Small Privacy Indicator */}
        <div className="mt-8 flex items-center gap-2 opacity-20 hover:opacity-100 transition-opacity cursor-default">
          <div className="w-1 h-1 rounded-full bg-white" />
          <span className="text-[9px] font-mono tracking-widest uppercase text-white">
            End-to-End Encryption Active
          </span>
        </div>
      </main>

      {/* Decorative HUD corners */}
      <div className="absolute top-10 left-10 w-20 h-20 border-t border-l border-white/10 rounded-tl-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-20 h-20 border-b border-r border-white/10 rounded-br-3xl pointer-events-none" />
    </div>
  );
}
