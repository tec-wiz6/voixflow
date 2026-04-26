import { motion } from "motion/react";
import { useEffect, useState } from "react";

interface AudioOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  volume: number;
}

export function AudioOrb({ isListening, isSpeaking, volume }: AudioOrbProps) {
  const [pulse, setPulse] = useState(1);

  useEffect(() => {
    if (isSpeaking || isListening) {
      setPulse(1 + (volume / 255) * 0.5);
    } else {
      setPulse(1);
    }
  }, [volume, isSpeaking, isListening]);

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer Glows */}
      <motion.div
        className="absolute inset-0 rounded-full bg-indigo-500/20 blur-3xl"
        animate={{
          scale: pulse * 1.2,
          opacity: isListening || isSpeaking ? 0.6 : 0.2,
        }}
        transition={{ duration: 0.2 }}
      />
      
      <motion.div
        className="absolute inset-0 rounded-full bg-emerald-500/10 blur-2xl"
        animate={{
          scale: pulse * 1.5,
          opacity: isListening || isSpeaking ? 0.4 : 0.1,
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Main Orb */}
      <motion.div
        id="voice-orb"
        className="relative w-48 h-48 rounded-full overflow-hidden"
        animate={{ scale: pulse }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-emerald-600 to-slate-900" />
        
        {/* Swirling Effects */}
        <motion.div
          className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.4),transparent_70%)]"
          animate={{
            rotate: -360,
            scale: [1, 1.1, 1],
          }}
          transition={{
            rotate: { duration: 15, repeat: Infinity, ease: "linear" },
            scale: { duration: 5, repeat: Infinity, ease: "easeInOut" }
          }}
        />

        {/* Refractions */}
        <div className="absolute inset-0 border border-white/20 rounded-full shadow-[inset_0_0_20px_rgba(255,255,255,0.2)]" />
        <div className="absolute top-4 left-1/4 w-1/2 h-1/2 bg-white/20 blur-xl rounded-full translate-y-[-20%]" />
      </motion.div>

      {/* Secondary Orbitals */}
      {(isSpeaking || isListening) && (
        <motion.div
          className="absolute w-full h-full border border-indigo-400/20 rounded-full"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      {/* Center Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-white/80 font-sans font-medium text-sm tracking-widest uppercase">
          {isSpeaking ? "Speaking" : isListening ? "Listening" : "Standby"}
        </span>
      </div>
    </div>
  );
}
