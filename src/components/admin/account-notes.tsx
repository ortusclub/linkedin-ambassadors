"use client";

import { useState } from "react";
import { accountNotesTimeline } from "@/lib/account-notes";

export function AccountNotes({ accountId, notes, proof, onNotesSaved, onProofSaved }: {
  accountId: string; notes: string | null; proof: string | null;
  onNotesSaved: (notes: string) => void; onProofSaved: (value: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [proofDraft, setProofDraft] = useState(proof || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const entries = accountNotesTimeline(notes, proof);
  const fieldStyle = { width: "100%", minHeight: 90, padding: 12, borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text)", font: "inherit", resize: "vertical" as const };
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
  return <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
    <span style={{ color: "var(--muted)", fontSize: 12 }}>Newest first · dates are added automatically</span>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <textarea aria-label="New private account note" placeholder="Add an update about this account…" value={draft} onChange={e => setDraft(e.target.value)} maxLength={10000} disabled={busy} style={fieldStyle} />
      <button type="button" onClick={addNote} disabled={busy || !draft.trim()} style={{ ...buttonStyle, alignSelf: "flex-start" }}>{busy ? "Saving…" : "Add note"}</button>
      {error && <span role="alert" style={{ color: "var(--st-cancel-fg)" }}>{error}</span>}
    </div>
    <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {!entries.length && <span style={{ color: "var(--muted)" }}>No notes yet.</span>}
      {entries.map((entry, i) => <article key={`${entry.source}-${i}`} style={{ padding: "12px 14px", border: "1px solid var(--card-border)", borderRadius: 10, background: "var(--card)" }}>
        <div style={{ color: "var(--muted)", fontSize: 11, marginBottom: 6 }}>{entry.at ? entry.at.includes("T") ? new Date(entry.at).toLocaleString("en-GB") : entry.at : "Earlier notes · date not recorded"}</div>
        <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.5, color: "var(--text)" }}>{entry.text}</div>
      </article>)}
    </div>
    {proof && <details>
      <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: 12 }}>Edit existing private notes / proof</summary>
      <textarea aria-label="Existing private notes and proof" value={proofDraft} onChange={e => setProofDraft(e.target.value)} style={{ ...fieldStyle, minHeight: 180, marginTop: 8 }} />
      <button type="button" disabled={busy} style={buttonStyle} onClick={async () => {
        setBusy(true); setError("");
        try { await onProofSaved(proofDraft.trim()); } catch { setError("Could not save changes. Please retry."); } finally { setBusy(false); }
      }}>Save changes</button>
    </details>}
  </div>;
}
