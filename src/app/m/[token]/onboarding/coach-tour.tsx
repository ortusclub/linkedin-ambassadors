"use client";

import { useEffect, useLayoutEffect, useState } from "react";

// Lightweight first-timer coach-mark tour for the DIY onboarding wizard. Each step
// optionally targets an element by [data-tour="key"]; targeted steps get a spotlight
// (via a big box-shadow "hole") and a bubble placed above/below by available room.
// No targets are matched across steps, so keep the tour to a single visible screen.
export type TourStep = { target?: string; title: string; body: string };

export function CoachTour({ steps, onDone }: { steps: TourStep[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [vh, setVh] = useState(0);
  const step = steps[i];

  useEffect(() => { setVh(window.innerHeight); }, []);

  useLayoutEffect(() => {
    if (!step?.target) { setRect(null); return; }
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const update = () => { setRect(el.getBoundingClientRect()); setVh(window.innerHeight); };
    update();
    const t = window.setTimeout(update, 380); // settle after the smooth scroll
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.clearTimeout(t); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [i, step?.target]);

  if (!step) return null;
  const last = i + 1 >= steps.length;
  const next = () => (last ? onDone() : setI(i + 1));

  // Place the bubble below the target if there's room, otherwise above; centred when
  // there's no target.
  const gap = 10;
  const roomBelow = rect ? vh - rect.bottom > 210 : true;
  const bubblePos: React.CSSProperties = !rect
    ? { top: "50%", transform: "translateY(-50%)" }
    : roomBelow
      ? { top: Math.min(rect.bottom + gap, vh - 20) }
      : { bottom: Math.max(vh - rect.top + gap, 20) };

  const btn = (bg: string, color: string): React.CSSProperties => ({ font: "700 12.5px 'Plus Jakarta Sans',sans-serif", color, background: bg, border: bg === "transparent" ? "1px solid #e3e6ea" : "none", padding: "10px 15px", borderRadius: 10, cursor: "pointer" });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
      {rect ? (
        <div style={{ position: "fixed", left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12, borderRadius: 14, boxShadow: "0 0 0 9999px rgba(9,17,12,.62)", pointerEvents: "none" }} />
      ) : (
        <div style={{ position: "fixed", inset: 0, background: "rgba(9,17,12,.62)" }} />
      )}
      <div style={{ position: "fixed", left: 12, right: 12, ...bubblePos }}>
        <div style={{ maxWidth: 408, margin: "0 auto", background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 22px 44px -18px rgba(0,0,0,.55)", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
          <div style={{ font: "700 10.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".07em", textTransform: "uppercase", color: "#15803d", marginBottom: 5 }}>Quick tour · {i + 1} of {steps.length}</div>
          <div style={{ font: "700 15.5px 'Plus Jakarta Sans',sans-serif", color: "#0b1220", marginBottom: 5 }}>{step.title}</div>
          <p style={{ font: "500 12.5px/1.55 'Plus Jakarta Sans',sans-serif", color: "#5b6779", margin: "0 0 14px" }}>{step.body}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={onDone} style={{ font: "600 12px 'Plus Jakarta Sans',sans-serif", color: "#98a2b3", background: "none", border: 0, cursor: "pointer", padding: "8px 0" }}>Skip</button>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              {i > 0 && <button onClick={() => setI(i - 1)} style={btn("transparent", "#0b1220")}>Back</button>}
              <button onClick={next} style={btn("#16a34a", "#fff")}>{last ? "Got it" : "Next"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
