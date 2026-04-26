import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  // Position of the tooltip relative to the spotlight
  placement: "top" | "bottom" | "left" | "right" | "center";
  // CSS selector OR a ref key to highlight
  targetSelector?: string;
  // If no target, show centered
  centered?: boolean;
}

const STEPS: TutorialStep[] = [
  {
    id: "orb-start",
    title: "Tap the orb to talk",
    body: "This glowing orb is your voice button. Tap it once and start speaking — VoixFlow will listen instantly.",
    placement: "top",
    targetSelector: "[data-tutorial='orb']",
  },
  {
    id: "orb-stop",
    title: "Tap again to stop",
    body: "When you're done, tap the orb again. Your conversation is saved automatically and a fresh session begins.",
    placement: "top",
    targetSelector: "[data-tutorial='orb']",
  },
  {
    id: "mode-toggle",
    title: "Switch to text chat",
    body: "Prefer typing? Hit the Chat tab up here to switch to a full text conversation — same AI, different vibe.",
    placement: "bottom",
    targetSelector: "[data-tutorial='mode-toggle']",
  },
  {
    id: "history",
    title: "History",
    body: "All past conversations live here. Tap to switch between or manage sessions.",
    placement: "bottom",
    targetSelector: "[data-tutorial='history-btn']",
  },
  {
    id: "settings",
    title: "Settings",
    body: "Customize your name or replay this tutorial anytime from the settings menu.",
    placement: "bottom",
    targetSelector: "[data-tutorial='settings-btn']",
  },
  {
    id: "done",
    title: "You're all set! 🎉",
    body: "Ready to flow? Go have a natural conversation with VoixFlow!",
    placement: "center",
    centered: true,
  },
];

interface TutorialProps {
  userName: string;
  onComplete: () => void;
  onSkip: () => void;
}

const ease = [0.16, 1, 0.3, 1] as any;

export function Tutorial({ userName, onComplete, onSkip }: TutorialProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [spotlight, setSpotlight] = useState<DOMRect | null>(null);
  const [showSkipWarn, setShowSkipWarn] = useState(false);

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  // Calculate spotlight rect from selector
  useEffect(() => {
    if (step.centered || !step.targetSelector) {
      setSpotlight(null);
      return;
    }

    const measure = () => {
      const el = document.querySelector(step.targetSelector!);
      if (el) setSpotlight(el.getBoundingClientRect());
      else setSpotlight(null);
    };

    measure();
    // Re-measure on resize
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [stepIdx, step]);

  const next = () => {
    if (isLast) { onComplete(); return; }
    setStepIdx(i => i + 1);
  };

  const handleSkip = () => {
    if (!showSkipWarn) { setShowSkipWarn(true); return; }
    onSkip();
  };

  // Tooltip position relative to spotlight
  const tooltipStyle = (): React.CSSProperties => {
    if (!spotlight || step.centered) {
      return {
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const PAD = 16;
    const W   = Math.min(260, window.innerWidth - 40);
    const isPC = window.innerWidth > 768;

    // For central or right-aligned targets on PC, prefer a left placement to avoid covering the UI
    if (isPC && step.placement !== "center") {
      const isOrb = step.targetSelector === "[data-tutorial='orb']";
      const isCentralOrRight = isOrb || spotlight.left > window.innerWidth * 0.4;
      
      if (isCentralOrRight) {
        return {
          position: "fixed",
          top: isOrb ? spotlight.top + spotlight.height / 2 - 80 : Math.max(20, spotlight.top - 20),
          left: Math.max(20, spotlight.left - W - PAD * 2),
          width: W,
        };
      }
    }

    switch (step.placement) {
      case "bottom":
        return {
          position: "fixed",
          top:  spotlight.bottom + PAD,
          left: Math.min(
            Math.max(spotlight.left + spotlight.width / 2 - W / 2, 20),
            window.innerWidth - W - 20
          ),
          width: W,
        };
      case "top": {
        const isOrb = step.targetSelector === "[data-tutorial='orb']";
        // If it's the orb on mobile, we allow the tooltip to overlap the orb significantly
        // to gain vertical space and prevent it from hitting the top of the screen.
        const verticalOffset = isOrb ? -40 : PAD;
        return {
          position: "fixed",
          bottom: window.innerHeight - (isOrb ? spotlight.top + 20 : spotlight.top) + verticalOffset,
          left: Math.min(
            Math.max(spotlight.left + spotlight.width / 2 - W / 2, 20),
            window.innerWidth - W - 20
          ),
          width: W,
        };
      }
      default:
        return {
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: W,
        };
    }
  };

  // Spotlight padding
  const SPOT_PAD = 12;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, pointerEvents: "none" }}>

      {/* Dark overlay with spotlight cutout */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "all" }}
        onClick={e => e.stopPropagation()}
      >
        <defs>
          <mask id="tut-mask">
            <rect width="100%" height="100%" fill="white" />
            {spotlight && (
              <rect
                x={spotlight.left - SPOT_PAD}
                y={spotlight.top  - SPOT_PAD}
                width={spotlight.width  + SPOT_PAD * 2}
                height={spotlight.height + SPOT_PAD * 2}
                rx={16}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%" height="100%"
          fill="rgba(0,0,0,0.72)"
          mask="url(#tut-mask)"
        />
        {/* Spotlight border glow */}
        {spotlight && (
          <rect
            x={spotlight.left - SPOT_PAD}
            y={spotlight.top  - SPOT_PAD}
            width={spotlight.width  + SPOT_PAD * 2}
            height={spotlight.height + SPOT_PAD * 2}
            rx={16}
            fill="none"
            stroke="rgba(99,102,241,0.6)"
            strokeWidth={1.5}
          />
        )}
      </svg>

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.3, ease }}
          style={{
            ...tooltipStyle(),
            pointerEvents: "all",
            zIndex: 201,
            background: "rgba(12,12,28,0.97)",
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            padding: "22px 22px 18px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.15)",
          }}
        >
          {/* Progress dots */}
          <div style={{ display: "flex", gap: 5, marginBottom: 16 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                height: 3, borderRadius: 2,
                flex: i === stepIdx ? 2 : 1,
                background: i <= stepIdx
                  ? "linear-gradient(90deg, #6366f1, #8b5cf6)"
                  : "rgba(255,255,255,0.1)",
                transition: "flex 0.35s ease, background 0.25s",
              }} />
            ))}
          </div>

          {/* Greeting on first step */}
          {stepIdx === 0 && (
            <p style={{ fontSize: 12, color: "#818cf8", fontFamily: "'DM Mono', monospace", marginBottom: 6, letterSpacing: "0.05em" }}>
              HEY {userName.toUpperCase()} 👋
            </p>
          )}

          <h3 style={{
            fontSize: 17, fontWeight: 700, color: "#fff",
            fontFamily: "'Sora', sans-serif", letterSpacing: "-0.01em",
            marginBottom: 8,
          }}>
            {step.title}
          </h3>

          <p style={{
            fontSize: 13.5, lineHeight: 1.65,
            color: "rgba(240,240,252,0.6)",
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 20,
          }}>
            {step.body}
          </p>

          {/* Skip warning */}
          <AnimatePresence>
            {showSkipWarn && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  background: "rgba(251,191,36,0.07)",
                  border: "1px solid rgba(251,191,36,0.2)",
                  borderRadius: 10, padding: "8px 12px", marginBottom: 14,
                }}
              >
                <p style={{ fontSize: 12, color: "rgba(251,191,36,0.85)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
                  You can replay this tutorial anytime from Settings. Skip anyway?
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={next}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff", fontSize: 14, fontWeight: 600,
                cursor: "pointer", letterSpacing: "0.01em",
                boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {isLast ? "Start using VoixFlow" : "Next →"}
            </button>

            {!isLast && (
              <button
                onClick={handleSkip}
                style={{
                  padding: "10px 14px", borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: showSkipWarn ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
                  color: showSkipWarn ? "#fca5a5" : "rgba(255,255,255,0.35)",
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.2s",
                }}
              >
                {showSkipWarn ? "Yes, skip" : "Skip"}
              </button>
            )}
          </div>

          {/* Step counter */}
          <p style={{
            textAlign: "center", marginTop: 12, fontSize: 11,
            color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace",
          }}>
            {stepIdx + 1} / {STEPS.length}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
