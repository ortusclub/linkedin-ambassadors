import { F_SANS } from "@/lib/pipeline-model";
import { parseOnboardingNotes, type NoteKind } from "@/lib/onboarding-notes";

const MARK: Record<NoteKind, { char: string; color: string }> = {
  check: { char: "✓", color: "var(--st-active-fg,#188038)" },
  warn: { char: "⚠", color: "var(--warn-badge-text,#b7791f)" },
  bullet: { char: "•", color: "var(--muted2,#9aa0a6)" },
};

// Renders the free-text onboarding notes as tidy dated sections. Unrecognised text (e.g. a
// hand-typed team note) falls through to plain, wrapped text so nothing is ever lost.
export function OnboardingNotes({ text }: { text: string | null | undefined }) {
  const { sections, existingAccount, fallback } = parseOnboardingNotes(text);
  if (fallback) return <div style={{ font: `500 12.5px/1.55 ${F_SANS}`, color: "var(--fg,#444)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{fallback}</div>;
  if (!sections.length && !existingAccount) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {existingAccount && (
        <div style={{ font: `600 11.5px ${F_SANS}`, color: "var(--st-cancel-fg,#c0392b)", background: "var(--st-cancel-bg,#fdecea)", border: "1px solid var(--st-cancel-border,#f5c6cb)", borderRadius: 8, padding: "7px 10px", lineHeight: 1.4 }}>⚠ Existing account submission — review before activation or payout</div>
      )}
      {sections.map((s, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {(s.label || s.date) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {s.label && <span style={{ font: `700 9.5px ${F_SANS}`, letterSpacing: ".05em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 6, background: "var(--st-conv-bg,#efe8fd)", color: "var(--st-conv-fg,#6d28d9)" }}>{s.label}</span>}
              {s.date && <span style={{ font: `500 11px ${F_SANS}`, color: "var(--muted2,#9aa0a6)" }}>{s.date}</span>}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {s.items.map((it, j) => (
              <div key={j} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                <span style={{ flex: "none", font: `700 12px ${F_SANS}`, color: MARK[it.kind].color, lineHeight: 1.45 }}>{MARK[it.kind].char}</span>
                <span style={{ font: `500 12.5px/1.45 ${F_SANS}`, color: it.kind === "warn" ? "var(--warn-badge-text,#b7791f)" : "var(--fg,#444)", overflowWrap: "anywhere" }}>{it.text}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
