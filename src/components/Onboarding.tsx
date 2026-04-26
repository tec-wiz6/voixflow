import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingProps {
  onComplete: (name: string) => void;
}

const ease = [0.16, 1, 0.3, 1] as any;

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<"welcome" | "name">("welcome");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "name") {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [step]);

  const handleNameSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("Please enter your name to continue."); return; }
    if (trimmed.length < 2) { setError("Name must be at least 2 characters."); return; }
    localStorage.setItem("voixflow_user_name", trimmed);
    onComplete(trimmed);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleNameSubmit();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#05050f", overflow: "hidden",
    }}>
      {/* Ambient blobs */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 60% 50% at 20% 10%, rgba(99,102,241,0.18) 0%, transparent 60%),
          radial-gradient(ellipse 50% 60% at 80% 90%, rgba(139,92,246,0.14) 0%, transparent 60%),
          radial-gradient(ellipse 40% 40% at 60% 40%, rgba(6,182,212,0.07) 0%, transparent 50%)
        `,
      }} />

      {/* Grain */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.022, pointerEvents: "none" }}>
        <filter id="ob-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#ob-grain)" />
      </svg>

      <AnimatePresence mode="wait">

        {/* ── STEP 1: Welcome ── */}
        {step === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ duration: 0.55, ease }}
            style={{
              position: "relative", zIndex: 1,
              display: "flex", flexDirection: "column", alignItems: "center",
              textAlign: "center", padding: "0 32px", maxWidth: 480,
            }}
          >
            {/* Logo mark */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1, ease }}
              style={{
                width: 72, height: 72, borderRadius: 22,
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 32,
                boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 8px 40px rgba(99,102,241,0.45)",
              }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12h3l3-8 4 16 3-8h7" />
              </svg>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease }}
              style={{
                fontSize: "clamp(32px, 6vw, 48px)",
                fontWeight: 700, letterSpacing: "-0.03em",
                fontFamily: "'Sora', sans-serif",
                background: "linear-gradient(135deg, #fff 50%, rgba(255,255,255,0.45))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                marginBottom: 16, lineHeight: 1.1,
              }}
            >
              Welcome to VoixFlow
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease }}
              style={{
                fontSize: 16, lineHeight: 1.7,
                color: "rgba(240,240,252,0.5)",
                marginBottom: 48, maxWidth: 360,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Your AI voice companion. Speak naturally, get instant intelligent responses — no typing required.
            </motion.p>

            {/* Feature pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              style={{ display: "flex", gap: 10, marginBottom: 48, flexWrap: "wrap", justifyContent: "center" }}
            >
              {[
                { icon: "🎙️", label: "Voice first" },
                { icon: "⚡", label: "Instant replies" },
                { icon: "💬", label: "Text chat too" },
              ].map(({ icon, label }) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "7px 14px", borderRadius: 999,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  fontSize: 13, color: "rgba(255,255,255,0.6)",
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  <span style={{ fontSize: 14 }}>{icon}</span> {label}
                </div>
              ))}
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.55, ease }}
              whileHover={{ scale: 1.03, boxShadow: "0 8px 40px rgba(99,102,241,0.5)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep("name")}
              style={{
                padding: "14px 40px", borderRadius: 16, border: "none",
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                color: "#fff", fontSize: 15, fontWeight: 600,
                cursor: "pointer", letterSpacing: "0.01em",
                boxShadow: "0 4px 24px rgba(99,102,241,0.4)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Get started →
            </motion.button>
          </motion.div>
        )}

        {/* ── STEP 2: Name ── */}
        {step === "name" && (
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease }}
            style={{
              position: "relative", zIndex: 1,
              display: "flex", flexDirection: "column", alignItems: "center",
              textAlign: "center", padding: "0 32px", maxWidth: 420, width: "100%",
            }}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.05, ease }}
              style={{
                width: 56, height: 56, borderRadius: 18,
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 28, fontSize: 24,
              }}
            >
              👋
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, ease }}
              style={{
                fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em",
                fontFamily: "'Sora', sans-serif",
                color: "#fff", marginBottom: 10,
              }}
            >
              What should we call you?
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.18 }}
              style={{ fontSize: 14, color: "rgba(255,255,255,0.38)", marginBottom: 32, fontFamily: "'DM Sans', sans-serif" }}
            >
              VoixFlow will personalise your experience.
            </motion.p>

            {/* Input */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, ease }}
              style={{ width: "100%", marginBottom: 12 }}
            >
              <input
                ref={inputRef}
                value={name}
                onChange={e => { setName(e.target.value); setError(""); }}
                onKeyDown={handleKey}
                placeholder="Your name…"
                maxLength={40}
                style={{
                  width: "100%", padding: "14px 18px",
                  borderRadius: 14, fontSize: 16,
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${error ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
                  color: "#fff", outline: "none",
                  fontFamily: "'DM Sans', sans-serif",
                  caretColor: "#818cf8",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  boxShadow: error ? "0 0 0 3px rgba(239,68,68,0.1)" : "none",
                }}
                onFocus={e => {
                  if (!error) e.target.style.borderColor = "rgba(99,102,241,0.5)";
                  if (!error) e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)";
                }}
                onBlur={e => {
                  if (!error) e.target.style.borderColor = "rgba(255,255,255,0.1)";
                  if (!error) e.target.style.boxShadow = "none";
                }}
              />
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ fontSize: 12, color: "#fca5a5", marginTop: 8, textAlign: "left", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.03, boxShadow: "0 8px 40px rgba(99,102,241,0.5)" }}
              whileTap={{ scale: 0.97 }}
              onClick={handleNameSubmit}
              style={{
                width: "100%", padding: "14px", borderRadius: 14, border: "none",
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                color: "#fff", fontSize: 15, fontWeight: 600,
                cursor: "pointer", letterSpacing: "0.01em",
                boxShadow: "0 4px 24px rgba(99,102,241,0.35)",
                fontFamily: "'DM Sans', sans-serif",
                transition: "box-shadow 0.2s",
              }}
            >
              Let's go
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}