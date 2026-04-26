import { motion, useAnimationFrame } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";

interface AudioOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  volume: number;
}

// Smooth exponential moving average to prevent jitter
function useSmoothValue(raw: number, alpha = 0.12) {
  const smoothed = useRef(raw);
  smoothed.current = smoothed.current + alpha * (raw - smoothed.current);
  return smoothed.current;
}

export function AudioOrb({ isListening, isSpeaking, volume }: AudioOrbProps) {
  const isActive = isListening || isSpeaking;
  const cappedVol = Math.min(volume, 100) / 100;
  const smoothVol = useSmoothValue(isActive ? cappedVol : 0);

  // Organic blob morph keyframes — pre-computed so they don't change on re-render
  const blobKeyframes = [
    "50% 50% 50% 50% / 50% 50% 50% 50%",
    "46% 54% 51% 49% / 52% 47% 53% 48%",
    "53% 47% 48% 52% / 48% 54% 46% 52%",
    "49% 51% 54% 46% / 54% 46% 50% 50%",
    "50% 50% 50% 50% / 50% 50% 50% 50%",
  ];

  const orbScale = 1 + smoothVol * 0.18;
  const auraScale = isActive ? 1.15 + smoothVol * 0.6 : 1;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 320, height: 320 }}
      aria-label={isListening ? "Listening" : isSpeaking ? "Speaking" : "Idle"}
    >
      {/* ── Ambient light bloom (outermost, cheapest blur) ── */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: -48,
          background:
            "radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.10) 40%, transparent 70%)",
          filter: "blur(40px)",
        }}
        animate={{ scale: auraScale, opacity: isActive ? 1 : 0.4 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* ── Chromatic halo ring ── */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: 8,
          background:
            "conic-gradient(from 0deg, #6366f1, #8b5cf6, #06b6d4, #6366f1)",
          filter: "blur(24px)",
          opacity: 0,
        }}
        animate={{
          opacity: isActive ? 0.22 + smoothVol * 0.18 : 0.06,
          rotate: isActive ? 360 : 0,
        }}
        transition={{
          opacity: { duration: 0.8, ease: "easeOut" },
          rotate: { duration: 8, repeat: Infinity, ease: "linear" },
        }}
      />

      {/* ── Ripple rings (only when active) ── */}
      {isActive &&
        [0, 0.7, 1.4].map((delay, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: 0,
              border: `1px solid rgba(${i === 0 ? "99,102,241" : i === 1 ? "139,92,246" : "6,182,212"},0.3)`,
            }}
            initial={{ scale: 0.85, opacity: 0.5 }}
            animate={{ scale: 2.6 + i * 0.45, opacity: 0 }}
            transition={{
              duration: 2.8 + i * 0.4,
              delay,
              repeat: Infinity,
              ease: [0.2, 0.8, 0.4, 1],
            }}
          />
        ))}

      {/* ── Main orb ── */}
      <motion.div
        className="relative overflow-hidden"
        style={{
          width: 260,
          height: 260,
          borderRadius: "50%",
          willChange: "transform",
          // Glass shell
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,0.15)",
            "inset 0 -1px 0 rgba(0,0,0,0.3)",
            `0 0 ${40 + smoothVol * 60}px rgba(99,102,241,${0.2 + smoothVol * 0.25})`,
            "0 32px 64px rgba(0,0,0,0.4)",
          ].join(", "),
          border: "1px solid rgba(255,255,255,0.09)",
        }}
        animate={{
          scale: orbScale,
          borderRadius: blobKeyframes,
        }}
        transition={{
          scale: { type: "spring", stiffness: 120, damping: 18, mass: 0.8 },
          borderRadius: {
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
      >
        {/* Dark base */}
        <div
          className="absolute inset-0"
          style={{ background: "rgba(6,6,18,0.95)" }}
        />

        {/* Slow-rotating colour core */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            inset: "-70%",
            background: `
              radial-gradient(circle at 30% 30%, rgba(99,102,241,0.9) 0%, transparent 45%),
              radial-gradient(circle at 70% 70%, rgba(139,92,246,0.8) 0%, transparent 45%),
              radial-gradient(circle at 50% 20%, rgba(6,182,212,0.6) 0%, transparent 40%)
            `,
            filter: "blur(44px)",
          }}
          animate={{
            rotate: 360,
            scale: [1, 1.12, 1],
            opacity: isActive ? 0.85 + smoothVol * 0.15 : 0.55,
          }}
          transition={{
            rotate: { duration: 22, repeat: Infinity, ease: "linear" },
            scale: { duration: 9, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 0.9, ease: "easeOut" },
          }}
        />

        {/* Counter-rotating accent layer */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            inset: "-50%",
            background: `
              radial-gradient(circle at 60% 20%, rgba(236,72,153,0.35) 0%, transparent 40%),
              radial-gradient(circle at 20% 80%, rgba(6,182,212,0.3) 0%, transparent 40%)
            `,
            filter: "blur(36px)",
          }}
          animate={{
            rotate: -360,
            opacity: isActive ? 0.6 + smoothVol * 0.2 : 0.25,
          }}
          transition={{
            rotate: { duration: 34, repeat: Infinity, ease: "linear" },
            opacity: { duration: 1.1, ease: "easeOut" },
          }}
        />

        {/* Volume pulse flash */}
        {isActive && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)",
            }}
            animate={{ opacity: [0, smoothVol * 0.5, 0] }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        )}

        {/* Top specular highlight — makes it feel like glass */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "8%",
            left: "12%",
            width: "55%",
            height: "38%",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.18) 0%, transparent 70%)",
            filter: "blur(6px)",
            transform: "rotate(-20deg)",
          }}
        />

        {/* Bottom sub-surface scatter */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: "6%",
            right: "10%",
            width: "45%",
            height: "30%",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse, rgba(139,92,246,0.2) 0%, transparent 70%)",
            filter: "blur(10px)",
          }}
        />

        {/* Inner vignette rim */}
        <div
          className="absolute inset-0 pointer-events-none rounded-full"
          style={{
            boxShadow: "inset 0 0 60px rgba(0,0,0,0.7)",
          }}
        />
      </motion.div>

      {/* ── Status dot ── */}
      {isActive && (
        <motion.div
          className="absolute"
          style={{
            bottom: 44,
            right: 44,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: isListening ? "#06b6d4" : "#8b5cf6",
            boxShadow: isListening
              ? "0 0 0 3px rgba(6,182,212,0.2), 0 0 16px rgba(6,182,212,0.9)"
              : "0 0 0 3px rgba(139,92,246,0.2), 0 0 16px rgba(139,92,246,0.9)",
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [1, 1.35, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}