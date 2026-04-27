import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AudioOrb } from "./components/AudioOrb";
import { useVoiceChat } from "./hooks/useVoiceChat";
import { Onboarding } from "./components/Onboarding";
import { Tutorial } from "./components/Tutorial";

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 20 }: { d: string | string[]; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const ICONS = {
  mic:      "M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zM19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8",
  chat:     "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  history:  ["M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", "M3 3v5h5", "M12 7v5l4 2"],
  trash:    ["M3 6h18", "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"],
  plus:     "M12 5v14M5 12h14",
  send:     "M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z",
  close:    "M18 6L6 18M6 6l12 12",
  waveform: "M2 12h3l3-8 4 16 3-8h7",
  settings: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"],
};

// ─── Typing dots ──────────────────────────────────────────────────────────────
const TypingDots = () => (
  <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
    {[0, 0.18, 0.36].map((delay, i) => (
      <motion.div key={i}
        style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(139,92,246,0.7)" }}
        animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 0.7, delay, repeat: Infinity, ease: "easeInOut" }}
      />
    ))}
  </div>
);

const fmt = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// ─── Settings modal ───────────────────────────────────────────────────────────
function SettingsModal({ onClose, onReplayTutorial }: { onClose: () => void; onReplayTutorial: () => void }) {
  const userName = localStorage.getItem("voixflow_user_name") || "";
  const [name, setName] = useState(userName);
  const [saved, setSaved] = useState(false);

  const save = () => {
    if (name.trim()) {
      localStorage.setItem("voixflow_user_name", name.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
  };

  const isMobile = window.innerWidth < 768;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      />
      <motion.div
        initial={isMobile ? { y: "100%", x: "-50%" } : { opacity: 0, scale: 0.95, y: -50, x: "-50%" }}
        animate={isMobile ? { y: 0, x: "-50%" } : { opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
        exit={isMobile ? { y: "100%", x: "-50%" } : { opacity: 0, scale: 0.95, y: 8, x: "-50%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        style={{
          position: "fixed", 
          ...(isMobile 
            ? { bottom: 12, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 24px)", borderRadius: 24 } 
            : { top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(320px, calc(100vw - 32px))", borderRadius: 20 }
          ),
          zIndex: 61,
          background: "rgba(10,10,24,0.98)", backdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.09)",
          padding: isMobile ? "16px 20px 24px" : "20px 18px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        }}
      >
        {isMobile && <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 16px", flexShrink: 0 }} />}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Sora', sans-serif", color: "#fff" }}>Settings</h2>
          {!isMobile && (
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Icon d={ICONS.close} size={13} />
            </button>
          )}
        </div>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>YOUR NAME</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && save()}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 10,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#fff", fontSize: 14, outline: "none", fontFamily: "'DM Sans', sans-serif",
                caretColor: "#818cf8",
              }}
            />
            <button onClick={save} style={{
              padding: "8px 14px", borderRadius: 10,
              background: saved ? "rgba(34,197,94,0.12)" : "rgba(99,102,241,0.12)",
              border: `1px solid ${saved ? "rgba(34,197,94,0.2)" : "rgba(99,102,241,0.2)"}`,
              color: saved ? "#86efac" : "#818cf8", fontSize: 12, fontWeight: 600,
              cursor: "pointer", transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif",
              whiteSpace: "nowrap",
            }}>
              {saved ? "✓ Saved" : "Save"}
            </button>
          </div>
        </div>

        {/* Replay tutorial */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
          <button
            onClick={() => { onClose(); onReplayTutorial(); }}
            style={{
              width: "100%", padding: "10px", borderRadius: 10,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8, transition: "background 0.2s",
            }}
          >
            🎓 Replay tutorial
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  // ── Onboarding / tutorial state ─────────────────────────────────────────────
  const [userName, setUserName]       = useState<string | null>(() => localStorage.getItem("voixflow_user_name"));
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // ── App state ────────────────────────────────────────────────────────────────
  const [mode, setMode]               = useState<"voice" | "chat">("voice");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [inputText, setInputText]     = useState("");
  const [isTyping, setIsTyping]       = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const prevMsgCount   = useRef(0);

  const {
    isConnected, isSpeaking, isListening, volume,
    sessions, activeSessionId, setActiveSessionId,
    currentMessages, error,
    connect, disconnect, sendTextMessage,
    startNewSession, deleteSession, clearHistory,
  } = useVoiceChat();

  // Auto-scroll chat
  useEffect(() => {
    if (mode === "chat") messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages, mode]);

  // Typing indicator
  useEffect(() => {
    if (currentMessages.length > prevMsgCount.current) {
      const last = currentMessages[currentMessages.length - 1];
      if (last?.role === "model" && last.text === "") {
        setIsTyping(true);
      } else {
        setIsTyping(false);
      }
    }
    prevMsgCount.current = currentMessages.length;
  }, [currentMessages]);

  // Auto-resize textarea
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }, []);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    sendTextMessage(inputText.trim());
    setInputText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [inputText, sendTextMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Orb tap
  const handleOrbTap = useCallback(() => {
    if (isConnected) disconnect();
    else connect();
  }, [isConnected, connect, disconnect]);

  const isMobile = window.innerWidth < 768;

  const recentVoice = currentMessages
    .filter(m => m.type === "voice")
    .filter((m, i, arr) => {
      if (m.role === "user") return true;
      // Hide AI response until it starts speaking to keep it synced
      if (!isSpeaking && i === arr.length - 1) return false;
      return m.text.length > 0;
    })
    .slice(-2);

  const statusLabel = isConnected
    ? isListening ? "Listening…" : isSpeaking ? "Speaking…" : "Connected — tap to end"
    : "Tap to start";

  const statusColor = isConnected
    ? isListening ? "#22d3ee" : isSpeaking ? "#a78bfa" : "rgba(255,255,255,0.35)"
    : "rgba(255,255,255,0.25)";

  // ── Onboarding complete ──────────────────────────────────────────────────────
  const handleOnboardingComplete = (name: string) => {
    setUserName(name);
    setShowTutorial(true);
  };

  // Show onboarding if no name
  if (!userName) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100dvh", overflow: "hidden", background: "#05050f" }}>

      {/* Atmosphere */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 70% 55% at 15% 5%,  rgba(99,102,241,0.13) 0%, transparent 55%),
          radial-gradient(ellipse 55% 65% at 85% 95%,  rgba(139,92,246,0.11) 0%, transparent 55%),
          radial-gradient(ellipse 45% 45% at 65% 25%,  rgba(6,182,212,0.06)  0%, transparent 50%)
        `,
      }} />

      {/* Grain */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.022, zIndex: 1, pointerEvents: "none" }}>
        <filter id="app-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#app-grain)" />
      </svg>

      {/* Main layout */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100%", maxWidth: 680, margin: "0 auto" }}>

        {/* ══ HEADER ══ */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)", background: "rgba(5,5,15,0.6)", flexShrink: 0,
        }}>
          {/* Logo + greeting */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(99,102,241,0.35)", flexShrink: 0,
            }}>
              <Icon d={ICONS.waveform} size={16} />
            </div>
            <div>
              <span style={{
                fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em",
                background: "linear-gradient(90deg, #fff 60%, rgba(255,255,255,0.5))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                fontFamily: "'Sora', sans-serif", display: "block", lineHeight: 1.1,
              }}>VoixFlow</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>
                Hey, {userName} 👋
              </span>
            </div>
          </div>

          {/* Mode toggle — data-tutorial attr for spotlight */}
          <div
            data-tutorial="mode-toggle"
            style={{
              display: "flex", gap: 2, padding: "3px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 999,
            }}
          >
            {(["voice", "chat"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 999, border: "none",
                background: mode === m ? "rgba(255,255,255,0.09)" : "transparent",
                color: mode === m ? "#fff" : "rgba(255,255,255,0.35)",
                fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.2s",
                boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
              }}>
                <Icon d={m === "voice" ? ICONS.mic : ICONS.chat} size={14} />
                {m === "voice" ? "Voice" : "Chat"}
              </button>
            ))}
          </div>

          {/* Right buttons */}
          <div style={{ display: "flex", gap: 6 }}>
            {/* History — data-tutorial attr */}
            <button
              data-tutorial="history-btn"
              onClick={() => setHistoryOpen(true)}
              style={{
                width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
            >
              <Icon d={ICONS.history} size={15} />
            </button>
            {/* Settings — data-tutorial attr */}
            <button
              data-tutorial="settings-btn"
              onClick={() => setShowSettings(true)}
              style={{
                width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
            >
              <Icon d={ICONS.settings} size={15} />
            </button>
          </div>
        </header>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              style={{ margin: "12px 20px 0", padding: "10px 16px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontSize: 13, flexShrink: 0 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ VOICE MODE ══ */}
        <AnimatePresence mode="wait">
          {mode === "voice" && (
            <motion.div key="voice"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", padding: "0 20px 24px" }}
            >
              {/* Tappable orb with data-tutorial attr */}
              <motion.div
                data-tutorial="orb"
                onClick={handleOrbTap}
                role="button"
                aria-label={isConnected ? "End voice session" : "Start voice session"}
                tabIndex={0}
                onKeyDown={e => e.key === "Enter" && handleOrbTap()}
                style={{ cursor: "pointer", userSelect: "none", WebkitUserSelect: "none", flexShrink: 0 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
              >
                <AudioOrb isListening={isListening} isSpeaking={isSpeaking} volume={volume} />
              </motion.div>

              {/* Status */}
              <motion.p animate={{ color: statusColor }} transition={{ duration: 0.4 }}
                style={{ marginTop: 20, fontSize: 12, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>
                {statusLabel}
              </motion.p>

              {!isConnected && (
                <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
                  Tap the orb to begin your conversation
                </motion.p>
              )}

              {/* Floating transcript */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                padding: "0 24px 24px", display: "flex", flexDirection: "column",
                justifyContent: "flex-end", gap: 10,
                pointerEvents: "none", maxHeight: 150, overflow: "hidden",
                zIndex: 5,
              }}>
                <AnimatePresence mode="popLayout">
                  {recentVoice.map(msg => (
                    <motion.div key={msg.id}
                      initial={{ opacity: 0, y: 15, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 8,
                        padding: "10px 14px", borderRadius: 14, maxWidth: "85%", backdropFilter: "blur(24px)",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                        transition: "all 0.3s ease",
                        ...(msg.role === "user"
                          ? { alignSelf: "flex-end", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }
                          : { alignSelf: "flex-start", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.22)" }),
                      }}
                    >
                      <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0, marginTop: 3, color: msg.role === "user" ? "rgba(255,255,255,0.35)" : "#a5b4fc", fontFamily: "'DM Mono', monospace" }}>
                        {msg.role === "user" ? "YOU" : "AI"}
                      </span>
                      <p style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.9)", margin: 0 }}>{msg.text}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ══ CHAT MODE ══ */}
          {mode === "chat" && (
            <motion.div key="chat"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
                {currentMessages.length === 0 ? (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, paddingBottom: 40 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, color: "rgba(255,255,255,0.4)" }}>
                      <Icon d={ICONS.chat} size={20} />
                    </div>
                    <p style={{ fontSize: 20, fontWeight: 600, color: "rgba(255,255,255,0.8)", letterSpacing: "-0.02em", fontFamily: "'Sora', sans-serif" }}>
                      Hey {userName}, what's on your mind?
                    </p>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Type below or switch to Voice</p>
                  </div>
                ) : (
                  <>
                    {currentMessages.map(msg => (
                      <motion.div key={msg.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22 }}
                        style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", alignItems: "flex-end", gap: 8 }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                          ...(msg.role === "user"
                            ? { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }
                            : { background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8" }),
                        }}>
                          {msg.role === "user" ? "U" : "AI"}
                        </div>
                        <div style={{
                          maxWidth: "72%", padding: "10px 14px", borderRadius: 16,
                          ...(msg.role === "user"
                            ? { borderBottomRightRadius: 4, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }
                            : { borderBottomLeftRadius: 4, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.16)" }),
                        }}>
                          {msg.text === "" && msg.role === "model"
                            ? <TypingDots />
                            : <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.88)", whiteSpace: "pre-wrap" }}>{msg.text}</p>
                          }
                          {msg.text !== "" && (
                            <p style={{ margin: "4px 0 0", fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace" }}>
                              {fmt(msg.timestamp)}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input bar */}
              <div style={{ padding: "12px 16px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(5,5,15,0.7)", backdropFilter: "blur(20px)", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "8px 8px 8px 16px" }}>
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message VoixFlow, ${userName}…`}
                    rows={1}
                    style={{ flex: 1, background: "none", border: "none", outline: "none", color: "rgba(255,255,255,0.88)", fontSize: 14, lineHeight: 1.6, resize: "none", fontFamily: "'DM Sans', sans-serif", minHeight: 24, maxHeight: 120, caretColor: "#818cf8" }}
                  />
                  <motion.button
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    whileHover={inputText.trim() ? { scale: 1.05 } : {}}
                    whileTap={inputText.trim() ? { scale: 0.95 } : {}}
                    style={{
                      width: 36, height: 36, borderRadius: 12, border: "none", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: inputText.trim() ? "pointer" : "default", transition: "all 0.2s",
                      background: inputText.trim() ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255,255,255,0.05)",
                      color: inputText.trim() ? "#fff" : "rgba(255,255,255,0.2)",
                      boxShadow: inputText.trim() ? "0 4px 12px rgba(99,102,241,0.35)" : "none",
                    }}
                  >
                    <Icon d={ICONS.send} size={15} />
                  </motion.button>
                </div>
                <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.15)", marginTop: 8 }}>
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══ HISTORY SHEET ══ */}
      <AnimatePresence>
        {historyOpen && (
          <>
            <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setHistoryOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }} />

            <motion.div key="sheet"
              initial={{ y: "100%", x: "-50%" }} animate={{ y: 0, x: "-50%" }} exit={{ y: "100%", x: "-50%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320, mass: 0.9 }}
              style={{
                position: "fixed", 
                ...(isMobile 
                  ? { bottom: 12, left: "50%", width: "calc(100% - 24px)", borderRadius: 24 } 
                  : { bottom: 0, left: "50%", width: "min(500px, 100%)", borderRadius: "24px 24px 0 0" }
                ),
                zIndex: 50,
                background: "rgba(8,8,20,0.97)", backdropFilter: "blur(32px)",
                border: "1px solid rgba(255,255,255,0.07)",
                maxHeight: "72vh", display: "flex", flexDirection: "column",
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "14px auto 6px", flexShrink: 0 }} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: "#fff", fontFamily: "'Sora', sans-serif" }}>History</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { startNewSession(); setHistoryOpen(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    <Icon d={ICONS.plus} size={13} /> New
                  </button>
                  <button onClick={() => setHistoryOpen(false)}
                    style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Icon d={ICONS.close} size={14} />
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
                {sessions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>No conversations yet</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {sessions.map(session => {
                      const isActive = session.id === activeSessionId;
                      const hasVoice = session.messages.some(m => m.type === "voice");
                      return (
                        <motion.div key={session.id}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, cursor: "pointer", background: isActive ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${isActive ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.06)"}`, transition: "all 0.18s" }}
                          onClick={() => { setActiveSessionId(session.id); setHistoryOpen(false); }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                        >
                          <div style={{ color: isActive ? "#818cf8" : "rgba(255,255,255,0.25)", flexShrink: 0 }}>
                            <Icon d={hasVoice ? ICONS.mic : ICONS.chat} size={15} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: isActive ? "#c4b5fd" : "rgba(255,255,255,0.75)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.title}</p>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>
                              {session.messages.filter(m => m.text).length} msg · {fmt(session.lastUpdated)}
                            </p>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); deleteSession(session.id); }}
                            style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "transparent", color: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.15s" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.color = "#f87171"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.2)"; }}
                          >
                            <Icon d={ICONS.trash} size={13} />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {sessions.length > 0 && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "12px 16px", flexShrink: 0 }}>
                  <button onClick={clearHistory}
                    style={{ width: "100%", padding: "10px", borderRadius: 12, border: "none", background: "transparent", color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#f87171"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
                  >
                    <Icon d={ICONS.trash} size={14} /> Clear all history
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══ SETTINGS MODAL ══ */}
      <AnimatePresence>
        {showSettings && (
          <SettingsModal
            onClose={() => setShowSettings(false)}
            onReplayTutorial={() => setShowTutorial(true)}
          />
        )}
      </AnimatePresence>

      {/* ══ TUTORIAL ══ */}
      <AnimatePresence>
        {showTutorial && (
          <Tutorial
            userName={userName}
            onComplete={() => {
              localStorage.setItem("voixflow_tutorial_done", "1");
              setShowTutorial(false);
            }}
            onSkip={() => {
              localStorage.setItem("voixflow_tutorial_done", "1");
              setShowTutorial(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
