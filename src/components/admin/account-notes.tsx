"use client";

import { useState } from "react";
import { accountNotesTimeline } from "@/lib/account-notes";
import { OnboardingNotes } from "@/components/admin/onboarding-notes";

export function AccountNotes({ accountId, notes, proof, sharedLog, onNotesSaved, onProofSaved }: {
  sharedLog?: Array<{ ch: string; text: string; at: string }> | null;
  accountId: string; notes: string | null; proof: string | null;
  onNotesSaved: (notes: string) => void; onProofSaved: (value: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [proofDraft, setProofDraft] = useState(proof || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sharedText = (sharedLog || []).filter(entry => entry.ch === "note").map(entry => `[${entry.at}] ${entry.text}`).join("\n");
  const entries = accountNotesTimeline([notes, sharedText].filter(Boolean).join("\n"), proof);
  const fieldStyle = { width: "100%", boxSizing: "border-box" as const, minHeight: 70, padding: 12, borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text)", font: "inherit", resize: "vertical" as const };
  const buttonStyle = { padding: "8px 13px", borderRadius: 8, border: "1px solid var(--btn-secondary-border)", background: "var(--btn-secondary-bg)", color: "var(--btn-secondary-fg)", cursor: "pointer" };
  async function addNote() {
    if (!draft.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: draft.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save note");
      onNotesSaved(data.notes); setDraft("");
    } catch { setError("Could not save note. Your text is still here; please retry."); }
    finally { setBusy(false); }
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 0, fontSize: 13, border: "1px solid var(--card-border)", borderRadius: 14, overflow: "hidden", background: "var(--card)" }}>
    <div style={{ padding: "14px 16px", background: "var(--input-bg)", borderBottom: "1px solid var(--card-border)", color: "var(--muted)", fontSize: 12 }}>{entries.length} notes · Newest first · dates added automatically</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 16 }}>
      <textarea aria-label="New private account note" placeholder="Add an update about this account…" value={draft} onChange={e => setDraft(e.target.value)} maxLength={10000} disabled={busy} style={fieldStyle} />
      <button type="button" onClick={addNote} disabled={busy || !draft.trim()} style={{ ...buttonStyle, alignSelf: "flex-start" }}>{busy ? "Saving…" : "Add note"}</button>
      {error && <span role="alert" style={{ color: "var(--st-cancel-fg)" }}>{error}</span>}
    </div>
    <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {!entries.length && <span style={{ color: "var(--muted)" }}>No notes yet.</span>}
      {entries.map((entry, i) => <article key={`${entry.source}-${i}`} style={{ padding: "14px 16px", borderTop: "1px solid var(--card-border)", background: "var(--card)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "var(--muted)", fontSize: 11, marginBottom: 8 }}><span style={{ padding: "3px 10px", borderRadius: 5, background: "var(--blue-chip-bg)", color: "var(--blue-chip-text)", fontWeight: 600 }}>NOTE</span><span>{entry.at ? entry.at.includes("T") ? new Date(entry.at).toLocaleString("en-GB") : entry.at : "Earlier notes · date not recorded"}</span></div>
        <OnboardingNotes text={entry.text} />
      </article>)}
    </div>
    {proof && <details style={{ padding: 16, borderTop: "1px solid var(--card-border)" }}>
      <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: 12 }}>Edit existing private notes / proof</summary>
      <textarea aria-label="Existing private notes and proof" value={proofDraft} onChange={e => setProofDraft(e.target.value)} style={{ ...fieldStyle, minHeight: 180, marginTop: 8 }} />
      <button type="button" disabled={busy} style={buttonStyle} onClick={async () => {
        setBusy(true); setError("");
        try { await onProofSaved(proofDraft.trim()); } catch { setError("Could not save changes. Please retry."); } finally { setBusy(false); }
      }}>Save changes</button>
    </details>}
  </div>;
}
