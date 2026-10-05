"use client";

// Shared pipeline detail components — the expanded-row panel (workflow rail, payments,
// restriction control, outreach log, credential fields). Drives the exact same behaviour
// and endpoints as the live pipeline; only the /admin/pipeline-new layout is restyled to
// the Pipeline v2 mock (workflow bar on top, then a 3-column card grid with per-card
// read/edit toggles and a compact payments summary).
import { useState } from "react";
import type { CSSProperties, ReactNode, MouseEvent } from "react";
import { formatMoney } from "@/lib/referral-currency";
import { formatName } from "@/lib/utils";
import { AccountNotes } from "@/components/admin/account-notes";
import { PipelineIssueActions } from "@/components/admin/pipeline-issue-actions";
import { ambassadorIssueContact } from "@/lib/issue-contacts";
import { isApplicationReceived, receiptPatch } from "@/lib/pipeline-received";
import { useQcChecks } from "@/components/admin/use-qc-checks";
import TotpCode from "@/app/m/[token]/onboarding/totp";
import { isLikelyTestEmail } from "@/lib/test-mode";
import {
  type Row, type Touch, F_SANS, F_GRO, labelCss, inputCss, btnSec, btnPrimary,
  applicationType, effectiveType, isLive, stageOf, isBlocked, levelKey, healthOf, needsGologin,
  STATUS_STYLE, STAGE_ACCENT, HEALTH_OPTIONS, ACCOUNT_STATUS_OPTIONS, OWNER_STATUS_OPTIONS,
  cfgOf, monthlyAmt, totalPaid, setupPaid, holdDays, matureDaysLeft, QC_ITEMS,
  fmtDate, fmtDateTime, ageDays, liHref, proxyCombined, parseProxy, initialsOf,
  messagingChannel, touchCount, touchLabel, touchChipStyle, lastTouchAt, nextStep,
  type Status, type Health,
} from "@/lib/pipeline-model";

type Handlers = {
  busy: boolean;
  patchApp: (id: string, patch: Record<string, unknown>, reload?: boolean) => void;
  patchAccount: (id: string, accountId: string, patch: Record<string, unknown>, reload?: boolean) => void;
  deleteRestrictionEvent: (accountId: string, at: string) => void;
  setStage: (r: Row, s: Status) => void;
  workflow: (id: string, patch: Record<string, unknown>) => void;
  provisionGologin: (r: Row) => void;
  deleteGologin: (r: Row) => void;
  emailIssue: (r: Row, issue: string) => void;
  logTouch: (id: string, ch: string, text: string, by: string) => Promise<void>;
  logPayment: (r: Row, kind: "setup" | "monthly") => Promise<void>;
  updatePayout: (r: Row, index: number, patch: { proofUrl?: string | null; notified?: boolean; acknowledged?: boolean }) => Promise<void>;
  onDeleteApp: (r: Row) => void;
};

export function SectionLabel({ children, num }: { children: ReactNode; num?: number }) {
  return <div style={{ ...labelCss, marginBottom: 10 }}>{num ? `${num} · ` : ""}{children}</div>;
}
export function D({ label, children }: { label: string; children?: ReactNode }) {
  const empty = children === null || children === undefined || children === "" || children === false;
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...labelCss, marginBottom: 3 }}>{label}</div>
      <div style={{ font: `600 13px ${F_SANS}`, color: empty ? "var(--muted2,#b6bbc2)" : "var(--fg,#111)", wordBreak: "break-word" }}>{empty ? "—" : children}</div>
    </div>
  );
}
export function Edit({ label, value, onSave, placeholder, numeric, hint, secret, openHref }: { label: string; value: string | number | null; onSave: (v: string | number | null) => void; placeholder?: string; numeric?: boolean; hint?: string; secret?: boolean; openHref?: string | null }) {
  const [reveal, setReveal] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <span style={labelCss}>{label}{hint && <span style={{ color: "var(--muted2,#9aa0a6)", textTransform: "none", letterSpacing: 0, fontWeight: 500 }}> · {hint}</span>}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <input defaultValue={value == null ? "" : String(value)} placeholder={placeholder} inputMode={numeric ? "numeric" : undefined} type={secret && !reveal ? "password" : "text"}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            const raw = e.target.value.trim();
            if (raw === (value == null ? "" : String(value))) return;
            onSave(numeric ? (raw === "" ? null : (parseInt(raw.replace(/[^0-9]/g, ""), 10) || null)) : (raw === "" ? null : raw));
          }} style={inputCss} />
        {openHref && <a href={liHref(openHref)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="Open link" style={{ font: `600 12px ${F_SANS}`, color: "var(--link,#0a66c2)", flex: "none", textDecoration: "none" }}>↗</a>}
        {secret && <span onClick={(e) => { e.stopPropagation(); setReveal((s) => !s); }} style={{ font: `600 11.5px ${F_SANS}`, color: "var(--muted,#8a97ad)", cursor: "pointer", flex: "none" }}>{reveal ? "Hide" : "Show"}</span>}
      </div>
    </div>
  );
}
export function EditSelect({ label, value, options, onSave }: { label: string; value: string; options: { value: string; label: string }[]; onSave: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <span style={labelCss}>{label}</span>
      <select value={value} onClick={(e) => e.stopPropagation()} onChange={(e) => onSave(e.target.value)} style={{ ...inputCss, cursor: "pointer" }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
export function Note({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ ...labelCss, marginBottom: 3 }}>{label}</div>
      <div style={{ font: `500 12.5px/1.55 ${F_SANS}`, color: "var(--fg,#444)", whiteSpace: "pre-wrap" }}>{children}</div>
    </div>
  );
}

// White rounded section card with an uppercase grey label (the Pipeline v2 card look).
function PanelCard({ title, right, children, tone }: { title: string; right?: ReactNode; children: ReactNode; tone?: "notes" }) {
  const notes = tone === "notes";
  return (
    <div style={{ background: notes ? "var(--warn-badge-bg,#fffdf5)" : "var(--card,#fff)", border: `1px solid ${notes ? "var(--warn-badge-border,#f1e3b5)" : "var(--card-border,#e3e3e6)"}`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
        <span style={{ ...labelCss, color: notes ? "var(--warn-badge-text,#a16207)" : "var(--label,#7c8597)" }}>{title}</span>
        {right}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </div>
  );
}

const editLinkStyle: CSSProperties = { font: `700 12px ${F_SANS}`, color: "var(--link,#2563eb)", background: "none", border: "none", cursor: "pointer", padding: 0, flex: "none" };

// Read-only value display with copy-on-click, link, and secret reveal. Used in view mode.
function ReadField({ label, value, href, secret, mono }: { label: string; value: string | number | null; href?: string | null; secret?: boolean; mono?: boolean }) {
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);
  const empty = value == null || value === "";
  const text = empty ? "" : String(value);
  const copy = (e: MouseEvent) => { e.stopPropagation(); if (empty) return; navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200); };
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...labelCss, marginBottom: 3 }}>{label}</div>
      {empty ? <span style={{ font: `600 13px ${F_SANS}`, color: "var(--muted2,#b6bbc2)" }}>—</span>
        : href ? <a href={liHref(href)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ font: `600 13px ${F_SANS}`, color: "var(--link,#0a66c2)", textDecoration: "none", wordBreak: "break-word" }}>{text} ↗</a>
          : <span onClick={copy} title="Click to copy" style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", maxWidth: "100%" }}>
              <span style={{ font: mono ? `600 12.5px ${F_GRO}` : `600 13px ${F_SANS}`, color: "var(--fg,#111)", wordBreak: "break-word" }}>{secret && !reveal ? "••••••••••" : text}</span>
              {secret && <button onClick={(e) => { e.stopPropagation(); setReveal((s) => !s); }} style={{ font: `600 11px ${F_SANS}`, color: "var(--link,#0a66c2)", background: "none", border: "none", cursor: "pointer", padding: 0, flex: "none" }}>{reveal ? "Hide" : "Show"}</button>}
              <span style={{ font: `600 10.5px ${F_SANS}`, color: copied ? "var(--st-active-fg,#15803d)" : "var(--muted2,#98a2b3)", flex: "none" }}>{copied ? "✓" : "⧉"}</span>
            </span>}
    </div>
  );
}

type FieldSpec = { k: string; label: string; value: string | number | null; onSave: (v: string | number | null) => void; kind?: "text" | "numeric" | "secret" | "link" | "select"; options?: { value: string; label: string }[]; placeholder?: string; hint?: string };

function renderField(f: FieldSpec, editing: boolean) {
  if (editing) {
    if (f.kind === "select") return <EditSelect key={f.k} label={f.label} value={String(f.value ?? "")} options={f.options || []} onSave={(v) => f.onSave(v)} />;
    return <Edit key={f.k} label={f.label} value={f.value} onSave={f.onSave} placeholder={f.placeholder} numeric={f.kind === "numeric"} secret={f.kind === "secret"} hint={f.hint} openHref={f.kind === "link" ? (f.value as string | null) : undefined} />;
  }
  if (f.kind === "select") { const lbl = f.options?.find((o) => o.value === String(f.value ?? ""))?.label ?? ""; return <ReadField key={f.k} label={f.label} value={lbl || null} />; }
  return <ReadField key={f.k} label={f.label} value={f.value} href={f.kind === "link" ? (f.value as string | null) : undefined} secret={f.kind === "secret"} mono={f.kind === "secret"} />;
}

// In view mode: show filled fields (and all selects); collapse empty text fields into a
// single "+ Add <fields>" affordance that enters edit mode.
function ToggleFields({ fields, editing, onEdit }: { fields: FieldSpec[]; editing: boolean; onEdit: () => void }) {
  const empties = fields.filter((f) => f.kind !== "select" && (f.value == null || f.value === ""));
  const names = empties.slice(0, 3).map((f) => f.label.replace(/ \(.*/, "").toLowerCase()).join(", ");
  return (
    <>
      {fields.map((f) => editing ? renderField(f, true) : (f.kind === "select" || !(f.value == null || f.value === "") ? renderField(f, false) : null))}
      {!editing && empties.length > 0 && (
        <button onClick={onEdit} style={{ alignSelf: "flex-start", font: `600 12px ${F_SANS}`, color: "var(--muted,#5b6779)", background: "var(--inset,#fafbfc)", border: "1px dashed var(--input-border,#d5d9e0)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", textAlign: "left" }}>+ Add {names}{empties.length > 3 ? ` +${empties.length - 3}` : ""}</button>
      )}
    </>
  );
}

function SignupMeeting({ r }: { r: Row }) {
  const latest = new Map<string, Touch>();
  for (const entry of r.outreachLog || []) if (entry.bookingKey && entry.scheduledAt) latest.set(entry.bookingKey, entry);
  const meetings = [...latest.values()].sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
  const active = meetings.filter(m => !m.cancelled);
  const meeting = active.find(m => new Date(m.scheduledAt!).getTime() >= Date.now()) || active[active.length - 1];
  const when = meeting?.scheduledAt || (!meetings.length && r.call?.stage !== "none" ? r.call?.scheduledAt : null);
  return <div style={{ padding: 9, borderRadius: 8, background: "var(--link-bg,#eaf1ff)", fontSize: 11, lineHeight: 1.5 }}>
    <b>{when ? "Meeting booked" : meetings.length ? "Meeting cancelled · no active booking" : "No meeting booking recorded yet"}</b>
    {when ? <div><time dateTime={when}>{new Date(when).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time><br /><small>{Intl.DateTimeFormat().resolvedOptions().timeZone}</small></div> : <div>Calendar updates can take a few minutes to sync.</div>}
  </div>;
}

export function WorkflowRail({ r, busy, workflow }: { r: Row; busy: boolean; workflow: (id: string, patch: Record<string, unknown>) => void }) {
  const qcPassed = !!r.verifiedAt;
  const matureStartMs = r.verifiedAt ? new Date(r.verifiedAt).getTime() : null;
  const matureDue = matureStartMs !== null ? matureStartMs + holdDays(r) * 86400000 : null;
  const matured = matureDue !== null && matureDaysLeft(matureDue) <= 0;
  const gated = false;

  const qcState = useQcChecks(r.id, r.qcChecks);
  const qc = qcState.checks;
  const qcCount = QC_ITEMS.filter(([k]) => qc[k]).length;
  const allQc = qcCount === QC_ITEMS.length;

  type Step = { label: string; title: string; sub: string; done: boolean; render: (isNext: boolean) => ReactNode };
  const stepCard = (label: string, title: string, sub: string, isNext: boolean, done: boolean, body: ReactNode) => (
    <div style={{ flex: "1 1 190px", minWidth: 180, background: "var(--card,#fff)", border: `1px solid ${done ? "var(--st-active-fg,#188038)" : isNext ? "#1a56db" : "var(--divider,#eee)"}`, borderRadius: 10, padding: "11px 12px" }}>
      <div style={{ ...labelCss, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 6, color: done ? "var(--st-active-fg,#188038)" : isNext ? "#1a56db" : "var(--muted,#8a97ad)" }}>{done ? "COMPLETED" : isNext ? "NOT COMPLETED · NEXT STEP" : "NOT COMPLETED"}</div>
      <div style={{ font: `600 12.5px ${F_SANS}`, color: "var(--fg,#111)", marginBottom: 3 }}>{title}</div>
      <div style={{ font: `500 11px ${F_SANS}`, color: "var(--muted,#8a97ad)", marginBottom: 8, minHeight: 15 }}>{sub}</div>
      {body}
    </div>
  );
  const doneBadge = (text: string) => <span style={{ font: `600 11.5px ${F_SANS}`, color: "var(--st-active-fg,#188038)", background: "var(--st-active-bg,#e6f4ea)", padding: "6px 10px", borderRadius: 7, display: "inline-block" }}>✓ {text}</span>;
  const undoLink = (patch: Record<string, unknown>) => <button disabled={busy} onClick={() => workflow(r.id, patch)} style={{ font: `500 10.5px ${F_SANS}`, color: "var(--muted,#8a97ad)", cursor: "pointer", background: "transparent", border: "none", padding: 0, textAlign: "left" }}>Undo completion</button>;
  const primaryBtn = (isNext: boolean): CSSProperties => ({ ...btnPrimary, width: "100%", background: isNext ? "#1a56db" : "var(--btn-secondary-bg,#fff)", color: isNext ? "#fff" : "var(--btn-secondary-fg,#333)", border: isNext ? "none" : "1px solid var(--btn-secondary-border,#dcdce0)" });
  const doneCol = (badge: string, undo: Record<string, unknown>) => <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{doneBadge(badge)}{undoLink(undo)}</div>;

  const steps: Step[] = [
    {
      label: "Step 1", title: "Application received", sub: r.createdAt ? `applied ${fmtDate(r.createdAt)}` : "in the pipeline", done: isApplicationReceived(r),
      render: (isNext) => <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {isApplicationReceived(r) ? doneCol("Received", receiptPatch(r, false)) : <button onClick={() => workflow(r.id, receiptPatch(r, true))} disabled={busy} style={primaryBtn(isNext)}>Mark received</button>}
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--fg,#111)" }}>
          <b>Signup: {effectiveType(r).label}</b>
          {r.diyTier && <div style={{ color: "var(--muted,#8a97ad)", marginTop: 4 }}>{r.diyTier === "standard" ? "Submitted the form for our team to handle setup." : r.diyTier === "partial" ? "Chose to add the LV email and set up 2FA themselves." : "Chose to handle email, 2FA and GoLogin themselves."}</div>}
          {r.diyTier !== "standard" && r.diyTier && <small>Chosen route — completion is tracked in the steps below.</small>}
        </div>
        {r.diyTier === "standard" && <SignupMeeting r={r} />}
        {!isLive(r) && r.status !== "rejected" && <button onClick={() => workflow(r.id, { status: "rejected" })} disabled={busy} style={{ font: `600 12px ${F_SANS}`, color: "var(--danger,#c0392b)", background: "transparent", border: "1px solid var(--danger-border,#e6b4ad)", padding: "8px 13px", borderRadius: 8, cursor: "pointer" }}>Reject</button>}
      </div>,
    },
    {
      label: "Step 2", title: "LV email added & primary", sub: r.emailPrimaryAt ? `done ${fmtDate(r.emailPrimaryAt)}` : "our email is on the account & set primary", done: !!r.emailPrimaryAt,
      render: (isNext) => r.emailPrimaryAt ? doneCol("Email primary", { emailPrimaryAt: null })
        : <button onClick={() => workflow(r.id, { emailPrimaryAt: new Date().toISOString() })} disabled={busy} style={primaryBtn(isNext)}>Mark email added &amp; primary</button>,
    },
    {
      label: "Step 3", title: "Logged into GoLogin", sub: r.onboardedAt ? `logged in ${fmtDate(r.onboardedAt)}` : "sign in via the GoLogin profile", done: !!r.onboardedAt,
      render: (isNext) => r.onboardedAt ? doneCol("Logged in", { onboardedAt: null })
        : <button onClick={() => workflow(r.id, { status: "approved", onboardedAt: new Date().toISOString() })} disabled={busy} style={primaryBtn(isNext)}>Mark logged in</button>,
    },
    {
      label: "Step 4", title: "Passed checks & QC",
      sub: r.verifiedAt ? `passed ${fmtDate(r.verifiedAt)}` : `quality control · ${qcCount}/${QC_ITEMS.length} checks`,
      done: !!r.verifiedAt,
      render: (isNext) => r.verifiedAt
        ? doneCol("Passed QC", { verifiedAt: null, onboardingStartedAt: null })
        : (<div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {QC_ITEMS.map(([key, lbl]) => {
              const on = !!qc[key];
              return (
                <label key={key} style={{ display: "flex", alignItems: "flex-start", gap: 7, cursor: busy ? "wait" : "pointer", font: `500 11px ${F_SANS}`, color: on ? "var(--st-active-fg,#188038)" : "var(--fg,#111)" }}>
                  <input type="checkbox" checked={on} onChange={event => qcState.toggle(key, event.target.checked)} style={{ width: 15, height: 15, marginTop: 1, accentColor: "var(--st-active-fg,#188038)", flex: "none", cursor: "pointer" }} />
                  <span>{lbl}</span>
                </label>
              );
            })}
            {qcState.saving && <small role="status">Saving checks…</small>}
            {qcState.error && <div role="alert" style={{ fontSize: 11, color: "#b91c1c" }}>{qcState.error} <button onClick={qcState.retry}>Retry</button></div>}
            <button onClick={() => workflow(r.id, { verifiedAt: new Date().toISOString(), onboardingStartedAt: new Date().toISOString() })} disabled={busy || !allQc || qcState.saving || !!qcState.error} title={allQc ? "Mark QC as passed" : "Tick all checks first"} style={{ ...primaryBtn(isNext), marginTop: 2, opacity: allQc ? 1 : 0.5, cursor: allQc ? "pointer" : "not-allowed" }}>Mark QC passed</button>
          </div>),
    },
    {
      label: "Step 5", title: "Matured — ready to onboard",
      sub: !qcPassed ? "starts once QC is passed" : matured ? "maturation complete" : `maturing · ready ${matureDue ? fmtDate(new Date(matureDue).toISOString()) : "—"}`,
      done: matured,
      render: () => !qcPassed
        ? <span style={{ font: `500 11px ${F_SANS}`, color: "var(--muted2,#9aa0a6)" }}>🔒 pass QC to begin</span>
        : matured
          ? doneBadge("Matured — ready")
          : <span style={{ font: `500 11px ${F_SANS}`, color: "var(--muted2,#9aa0a6)" }}>maturing · 1 week hold…</span>,
    },
  ];
  let unlocked = true;
  let effLevel = 0;
  for (const s of steps) { if (s.done) effLevel++; else break; }

  return (
    <div style={{ background: "var(--inset,#fafbfc)", border: "1px solid var(--divider,#eee)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <SectionLabel>Workflow</SectionLabel>
          <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted,#8a97ad)" }}>Next: <b style={{ color: "var(--fg,#111)" }}>{nextStep(r).label}</b></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span title="The account's stage = the lowest step not yet complete. Ticking a later step doesn't advance the level until the steps before it are done." style={{ font: `700 11px ${F_SANS}`, color: effLevel >= steps.length ? "var(--st-active-fg,#188038)" : "var(--sheets-btn-bg,#1a56db)", background: effLevel >= steps.length ? "var(--st-active-bg,#e6f4ea)" : "var(--link-bg,#eaf1ff)", padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>Level {effLevel}/{steps.length}</span>
          {r.linkedinUrl && <a href={liHref(r.linkedinUrl)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ font: `700 12px ${F_SANS}`, color: "var(--link,#0a66c2)", textDecoration: "none", whiteSpace: "nowrap" }}>Open LinkedIn ↗</a>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "stretch", gap: 8, flexWrap: "wrap" }}>
        {steps.map((s, i) => {
          const isNext = !s.done && unlocked && !gated;
          if (!s.done) unlocked = false;
          return <div key={i} style={{ flex: "1 1 190px", minWidth: 180 }}>{stepCard(s.label, s.title, s.sub, isNext, s.done, s.render(isNext))}</div>;
        })}
      </div>
    </div>
  );
}

export function RestrictionControl({ r, onAccount, onApp, onDeleteEvent }: { r: Row; onAccount: (patch: Record<string, unknown>, reload?: boolean) => void; onApp: (patch: Record<string, unknown>) => void; onDeleteEvent: (at: string) => void }) {
  const hasAcct = !!r.accountId;
  const issue = (r.accountIssue || "").toLowerCase();
  const restrictIssue = issue.includes("withdrawn") || issue.includes("permanent") || issue.includes("restricted");
  const current: "active" | "restricted" | "retired" | "withdrawn" =
    r.accountStatus === "removed" || issue.includes("withdrawn") ? "withdrawn"
      : r.accountStatus === "retired" || issue.includes("permanent") ? "retired"
        : r.accountRestrictedAt || issue.includes("restricted") ? "restricted"
          : "active";
  const dead = r.accountStatus === "retired" || r.accountStatus === "removed";
  const undead = dead ? { status: "unavailable" } : {};
  const apply = (key: "active" | "restricted" | "retired" | "withdrawn") => {
    if (key === "active" && r.restrictionReport) onApp({ setRestrictionReport: null, restrictionReport: null });
    if (hasAcct) {
      const patch: Record<string, unknown> = key === "active" ? { restrictedAt: null, ...undead } : key === "restricted" ? { restrictedAt: new Date().toISOString(), ...undead } : key === "retired" ? { status: "retired", restrictedAt: new Date().toISOString() } : { status: "removed" };
      if (key === "active" && restrictIssue) patch.accountIssue = null;
      onAccount(patch, true);
    } else {
      onApp({ accountIssue: key === "active" ? null : key === "restricted" ? "Restricted" : key === "retired" ? "Permanently restricted" : "Withdrawn" });
    }
  };
  const opts: { key: "active" | "restricted" | "retired" | "withdrawn"; label: string; tone: [string, string] }[] = [
    { key: "active", label: "Active", tone: ["--st-active-bg,#e6f4ea", "--st-active-fg,#188038"] },
    { key: "restricted", label: "Restricted", tone: ["--st-cancel-bg,#fdecea", "--st-cancel-fg,#c0392b"] },
    { key: "retired", label: "Perm. restricted", tone: ["--st-cancel-bg,#fdecea", "--st-cancel-fg,#c0392b"] },
    { key: "withdrawn", label: "Withdrawn", tone: ["--neutral-bg,#eef1f5", "--muted,#647189"] },
  ];
  const history = Array.isArray(r.accountRestrictionLog) ? r.accountRestrictionLog : [];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {opts.map((o) => {
          const on = current === o.key;
          return (
            <button key={o.key} onClick={(e) => { e.stopPropagation(); apply(o.key); }}
              style={{ font: `600 11.5px ${F_SANS}`, padding: "5px 11px", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap", border: "1px solid", borderColor: on ? "transparent" : "var(--input-border,#dcdce0)", background: on ? `var(${o.tone[0]})` : "transparent", color: on ? `var(${o.tone[1]})` : "var(--muted,#647189)" }}>
              {on ? "● " : ""}{o.label}
            </button>
          );
        })}
      </div>
      {history.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 12px", marginTop: 7, paddingLeft: 2 }}>
          {history.slice().reverse().map((e, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, font: `500 10.5px ${F_SANS}`, color: e.event === "recovered" ? "var(--st-active-fg,#188038)" : "var(--st-cancel-fg,#c0392b)" }}>
              {e.event === "recovered" ? "✓ Recovered" : "⚠ Restricted"} {fmtDate(e.at)}{e.creditedDays ? ` (+${e.creditedDays}d credit)` : ""}{e.note ? ` (${e.note})` : ""}
              {hasAcct && (
                <button
                  title="Delete this entry (added by mistake)"
                  onClick={(ev) => { ev.stopPropagation(); if (confirm(`Delete this ${e.event === "recovered" ? "recovered" : "restricted"} entry from ${fmtDate(e.at)}? This only fixes the history — it doesn't restrict or recover the account.`)) onDeleteEvent(e.at); }}
                  style={{ font: `700 11px ${F_SANS}`, lineHeight: 1, color: "var(--muted2,#9aa0a6)", background: "none", border: "none", cursor: "pointer", padding: "0 1px" }}>×</button>
              )}
            </span>
          ))}
        </div>
      )}
      {r.restrictionReport && current === "restricted" && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: "var(--purple-chip-bg,#efe7fd)", border: "1px solid var(--purple-chip-border,#d9c9fb)", borderRadius: 8, padding: "6px 10px" }}>
          <span style={{ font: `700 10.5px ${F_SANS}`, color: "var(--purple-chip-text,#6b3fd4)" }}>
            Referrer says {r.restrictionReport.type === "recovered" ? "it's unrestricted now" : "the owner did LinkedIn's QR/ID check"} · {fmtDate(r.restrictionReport.at)} — verify, then set Active to recover
          </span>
          <button onClick={(e) => { e.stopPropagation(); onApp({ setRestrictionReport: null, restrictionReport: null }); }} style={{ marginLeft: "auto", font: `700 10px ${F_SANS}`, padding: "3px 9px", borderRadius: 999, cursor: "pointer", border: "none", background: "var(--neutral-bg,#eef1f5)", color: "var(--muted,#647189)" }}>Dismiss</button>
        </div>
      )}
    </div>
  );
}

function OutreachLog({ r, busy, onLog, onSetFollowUp, onDelete }: { r: Row; busy: boolean; onLog: (id: string, ch: string, text: string, by: string) => Promise<void>; onSetFollowUp: (iso: string | null) => void; onDelete: (at: string) => void }) {
  const [draft, setDraft] = useState("");
  const [by, setBy] = useState("");
  const log = r.outreachLog;
  const chan = messagingChannel(r);
  const send = async (ch: string) => { await onLog(r.id, ch, draft.trim(), by.trim()); setDraft(""); };
  const followVal = r.nextFollowUp ? new Date(r.nextFollowUp).toISOString().slice(0, 10) : "";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted,#777)" }}>{touchCount(log)} {touchCount(log) === 1 ? "touch" : "touches"} · last {lastTouchAt(log) || "—"}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: `500 11.5px ${F_SANS}`, color: "var(--muted,#777)" }}>Follow up <input type="date" value={followVal} onChange={(e) => onSetFollowUp(e.target.value ? new Date(e.target.value).toISOString() : null)} style={{ ...inputCss, width: "auto", padding: "4px 7px", cursor: "pointer" }} /></span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What happened? Logged with the date and your name." style={{ ...inputCss, width: "100%" }} />
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input value={by} onChange={(e) => setBy(e.target.value)} placeholder="Who sent it?" style={{ ...inputCss, width: 130, flex: "none" }} />
          <span style={{ font: `600 10.5px ${F_SANS}`, color: "var(--muted2,#9aa0a6)" }}>LOG</span>
          {[chan, "email", "text", "note"].map((ch) => <button key={ch} onClick={() => send(ch)} disabled={busy} style={btnSec}>+ {touchLabel(ch)}</button>)}
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--divider,#eee)", paddingTop: 6, maxHeight: 300, overflowY: "auto" }}>
        {log && log.length ? [...log].reverse().map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "6px 0" }}>
            <span style={touchChipStyle(t.ch)}>{touchLabel(t.ch)}</span>
            <span title={t.text} style={{ flex: 1, minWidth: 0, font: `500 12.5px ${F_SANS}`, color: "var(--text2,#333)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}>{t.text}</span>
            <span style={{ font: `500 11px ${F_SANS}`, color: "var(--muted2,#9aa0a6)", whiteSpace: "nowrap", flex: "none" }}>{(t.by ? t.by + " · " : "") + fmtDateTime(t.at)}</span>
            <span onClick={() => { if (confirm("Delete this outreach entry?")) onDelete(t.at); }} title="Delete entry" style={{ font: `600 13px ${F_SANS}`, color: "var(--muted2,#9aa0a6)", cursor: "pointer", flex: "none", lineHeight: 1.2 }}>×</span>
          </div>
        )) : <span style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted,#777)" }}>No outreach logged yet.</span>}
      </div>
    </div>
  );
}

export function AccountOnlyCard({ r, patchAccount, deleteRestrictionEvent }: {
  r: Row;
  patchAccount: (id: string, accountId: string, patch: Record<string, unknown>, reload?: boolean) => void;
  deleteRestrictionEvent: (accountId: string, at: string) => void;
}) {
  const acctSave = (patch: Record<string, unknown>, reload = false) => { if (r.accountId) patchAccount(r.id, r.accountId, patch, reload); };
  const facts = [
    r.loginEmail && `Login: ${r.loginEmail}`,
    r.connectionCount != null && `${r.connectionCount} connections`,
    r.linkedinVerified && "Verified",
    r.proxyLocation && `Proxy: ${r.proxyLocation}`,
    r.accountStatus && `Status: ${r.accountStatus}`,
  ].filter(Boolean) as string[];
  return (
    <div style={{ background: "var(--card,#fff)", border: "1px solid var(--card-border,#e3e3e6)", borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ font: `700 15px ${F_GRO}`, color: "var(--fg,#111)" }}>{r.fullName}</span>
        <span title="Inventory account with no ambassador application" style={{ font: `700 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, background: "var(--band,#f1f1f2)", color: "var(--muted,#647189)" }}>Inventory only · no application</span>
        {r.accountRestrictedAt && <span style={{ font: `700 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, background: "var(--st-cancel-bg,#fdecea)", color: "var(--st-cancel-fg,#c0392b)" }}>⚠ Restricted {fmtDate(r.accountRestrictedAt)}</span>}
        <a href="/admin/accounts" style={{ marginLeft: "auto", font: `600 11.5px ${F_SANS}`, color: "var(--link,#1a56db)", textDecoration: "none" }}>Open in Inventory →</a>
      </div>
      {facts.length > 0 && <div style={{ font: `500 12px ${F_SANS}`, color: "var(--muted,#647189)", marginBottom: 10 }}>{facts.join("  ·  ")}</div>}
      <div style={{ ...labelCss, marginBottom: 6 }}>Restriction</div>
      <RestrictionControl r={r} onAccount={acctSave} onApp={() => {}} onDeleteEvent={(at) => { if (r.accountId) deleteRestrictionEvent(r.accountId, at); }} />
    </div>
  );
}

// The full expanded-row detail — Pipeline v2 layout: workflow bar on top, then a 3-column
// card grid. Applicant / Sign-in & credentials / Payout cards have a per-card read↔edit
// toggle; Payments is a compact summary that links out to the Payouts page. Same wiring.
export function CardDetail({ r, h }: { r: Row; h: Handlers }) {
  const { busy, patchApp, patchAccount, deleteRestrictionEvent, workflow, provisionGologin, deleteGologin, logTouch, onDeleteApp } = h;
  const [editSec, setEditSec] = useState<string | null>(null);
  const live = isLive(r);
  const onboarded = r.status === "onboarded";
  const acctSave = (patch: Record<string, unknown>, reload = false) => { if (r.accountId) patchAccount(r.id, r.accountId, patch, reload); };
  const photoUrl = (r.adminNotes || "").match(/Owner photo:\s*(https?:\/\/\S+)/)?.[1] || null;
  const col: CSSProperties = { flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 };
  const meetings = new Map<string, Touch>();
  for (const entry of r.outreachLog || []) if (entry.bookingKey && entry.scheduledAt) meetings.set(entry.bookingKey, entry);

  const applicantFields: FieldSpec[] = [
    { k: "linkedinUrl", label: "LinkedIn URL", value: r.linkedinUrl, kind: "link", placeholder: "linkedin.com/in/…", onSave: (v) => patchApp(r.id, { linkedinUrl: v }) },
    { k: "linkedinEmail", label: "Applied with (LinkedIn email)", value: r.linkedinEmail, placeholder: "same as owner", onSave: (v) => patchApp(r.id, { linkedinEmail: v }) },
    { k: "contactNumber", label: "Contact number / handle", value: r.contactNumber, placeholder: "phone / handle", onSave: (v) => patchApp(r.id, { contactNumber: v }) },
    { k: "contactChannel", label: "Contact channel", value: r.contactChannel, placeholder: "Viber / Telegram / WhatsApp", onSave: (v) => patchApp(r.id, { contactChannel: v }) },
    { k: "location", label: "Location", value: r.location, placeholder: "city / country", onSave: (v) => patchApp(r.id, { location: v }) },
    { k: "industry", label: "Industry", value: r.industry, placeholder: "—", onSave: (v) => patchApp(r.id, { industry: v }) },
    { k: "connections", label: "Connections", value: r.connectionCount, kind: "numeric", placeholder: "e.g. 500", onSave: (v) => patchApp(r.id, { connectionCount: v }) },
    { k: "referralSource", label: "Found us via", value: r.referralSource, placeholder: "flyer / FB / referral", onSave: (v) => patchApp(r.id, { referralSource: v }) },
    { k: "referredBy", label: "Referred by", value: r.referredBy, placeholder: "marketer code", onSave: (v) => patchApp(r.id, { referredBy: v }) },
    { k: "bookingEmail", label: "Booking email", value: r.bookingEmail, placeholder: "if booked with another email", onSave: (v) => patchApp(r.id, { bookingEmail: v }) },
    { k: "poc", label: "LV handler (POC)", value: r.poc, placeholder: "who's handling this", onSave: (v) => { if (!r.accountOnly) patchApp(r.id, { poc: v }); if (r.accountId) patchAccount(r.id, r.accountId, { poc: v }); } },
    { k: "ownerStatus", label: "Owner status", value: r.ownerStatus || "", kind: "select", options: OWNER_STATUS_OPTIONS, onSave: (v) => patchApp(r.id, { ownerStatus: (v as string) || null }) },
    { k: "accountIssue", label: "Account issue", value: r.accountIssue, placeholder: "login problem, restriction…", onSave: (v) => patchApp(r.id, { accountIssue: v }) },
  ];
  const credFields: FieldSpec[] = r.accountId ? [
    { k: "loginEmail", label: "Login email (work)", value: r.loginEmail, placeholder: "klabber address we sign in with", onSave: (v) => acctSave({ loginEmail: v }) },
    { k: "personalEmail", label: "Personal email (on account)", value: r.personalEmail, placeholder: "ambassador's own", onSave: (v) => acctSave({ personalEmail: v }) },
    { k: "workEmail", label: "Work / recovery email", value: r.workEmail, placeholder: "recovery email on the account", onSave: (v) => acctSave({ workEmail: v }) },
    { k: "password", label: "Password", value: r.accountPassword, kind: "secret", placeholder: "set account password", onSave: (v) => acctSave({ accountPassword: v }) },
    { k: "twofa", label: "2FA / TOTP", value: r.twoFactor, kind: "secret", hint: "backup code / secret", placeholder: "2FA secret / backup", onSave: (v) => acctSave({ twoFactor: v }) },
    { k: "gologin", label: "GoLogin share link", value: r.gologinShareLink, kind: "link", placeholder: "https://app.gologin.com/share/…", onSave: (v) => acctSave({ gologinShareLink: v }, true) },
    { k: "proxy", label: "Proxy · host:port:user:pass", value: proxyCombined(r), placeholder: "1.2.3.4:8000:username:password", onSave: (v) => acctSave(parseProxy(v)) },
    { k: "proxyLocation", label: "Proxy location", value: r.proxyLocation, placeholder: "City, Country", onSave: (v) => acctSave({ proxyLocation: v }) },
    { k: "accountStatus", label: "Account status", value: r.accountStatus || "under_review", kind: "select", options: ACCOUNT_STATUS_OPTIONS.map((s) => ({ value: s, label: s === "under_construction" ? "Pipeline" : s === "construction_immature" ? "Construction (Immature)" : s.replace(/_/g, " ") })), onSave: (v) => acctSave({ status: v }, true) },
    { k: "verified", label: "LinkedIn verified", value: r.linkedinVerified ? "yes" : "no", kind: "select", options: [{ value: "no", label: "No" }, { value: "yes", label: "✓ Yes" }], onSave: (v) => acctSave({ linkedinVerified: v === "yes" }, true) },
  ] : [];
  const payoutFields: FieldSpec[] = [
    { k: "method", label: "Method", value: r.paymentMethod, placeholder: "Wise / PayPal / GCash", onSave: (v) => patchApp(r.id, { paymentMethod: v }) },
    { k: "details", label: "Account no. / handle", value: r.paymentDetails, placeholder: "email / number / account", onSave: (v) => patchApp(r.id, { paymentDetails: v }) },
    { k: "payoutName", label: "Name on account", value: r.payoutName, placeholder: "name on the account", onSave: (v) => patchApp(r.id, { payoutName: v }) },
    { k: "currency", label: "Currency", value: r.payoutCurrency || "", kind: "select", options: [{ value: "", label: "Auto" }, { value: "PHP", label: "PHP ₱" }, { value: "USD", label: "USD $" }], onSave: (v) => patchApp(r.id, { payoutCurrency: (v as string) || null }) },
    ...(r.accountId ? [
      { k: "payoutMo", label: "Payout /mo", value: r.ambassadorPayment, kind: "numeric" as const, placeholder: "amount", onSave: (v: string | number | null) => acctSave({ ambassadorPayment: v ?? 0 }) },
      { k: "rentMo", label: "Rent /mo ($)", value: r.monthlyPrice, kind: "numeric" as const, placeholder: "e.g. 50", onSave: (v: string | number | null) => acctSave({ monthlyPrice: v ?? 0 }) },
    ] : []),
  ];

  const appEditing = editSec === "applicant";
  const credEditing = editSec === "cred";
  const payEditing = editSec === "payout";
  const editToggle = (sec: string, on: boolean) => <button onClick={(e) => { e.stopPropagation(); setEditSec(on ? null : sec); }} style={editLinkStyle}>{on ? "Done" : "Edit"}</button>;

  const cfg = cfgOf(r);
  const setupDone = setupPaid(r);
  const setupPay = (r.monthlyPayouts || []).find((p) => p.kind === "setup");
  const monthlyStarted = (r.monthlyPayouts || []).some((p) => p.kind === "monthly");
  const pill = (text: string, green?: boolean): CSSProperties => ({ font: `700 11px ${F_SANS}`, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap", flex: "none", background: green ? "var(--st-active-bg,#dcfce7)" : "var(--band,#f1f3f6)", color: green ? "var(--st-active-fg,#15803d)" : "var(--muted,#5b6779)" });
  const payRow = (title: string, sub: string, pillNode: ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ font: `700 13px ${F_SANS}`, color: "var(--fg,#111)" }}>{title}</div>
        <div style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted2,#9aa0a6)" }}>{sub}</div>
      </div>
      {pillNode}
    </div>
  );

  return (
    <div style={{ borderTop: "1px solid var(--divider,#eee)", background: "var(--panel,#fafafa)", padding: 16 }}>
      {!onboarded && <WorkflowRail r={r} busy={busy} workflow={workflow} />}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
        {/* ── Left column: Applicant · Sign-in & credentials ── */}
        <div style={col}>
          <PanelCard title="Applicant" right={<div style={{ display: "flex", alignItems: "center", gap: 10 }}>{r.linkedinUrl && <a href={liHref(r.linkedinUrl)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ font: `700 12px ${F_SANS}`, color: "var(--link,#0a66c2)", textDecoration: "none" }}>View profile ↗</a>}{editToggle("applicant", appEditing)}</div>}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, background: "var(--inset,#f8f9fb)", borderRadius: 12 }}>
              {photoUrl
                ? <a href={photoUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ flex: "none" }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={photoUrl} alt="Owner photo" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 12, border: "1px solid var(--line,#e6e8ec)", display: "block" }} /></a>
                : <div style={{ flex: "none", width: 64, height: 64, borderRadius: 12, border: "1.5px dashed var(--input-border,#c5cbd3)", background: "var(--card,#fff)", display: "flex", alignItems: "center", justifyContent: "center", font: `700 18px ${F_GRO}`, color: "var(--muted2,#b0b7c3)" }}>{initialsOf(r.fullName)}</div>}
              <div style={{ minWidth: 0 }}>
                <div style={{ ...labelCss, marginBottom: 3 }}>Owner photo · from onboarding</div>
                <div style={{ font: `600 12.5px ${F_SANS}`, color: photoUrl ? "var(--fg,#111)" : "var(--muted,#8a93a3)" }}>{photoUrl ? "Uploaded by the owner" : "No photo added — optional at signup"}</div>
                {photoUrl && <a href={photoUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ font: `700 12px ${F_SANS}`, color: "var(--link,#0a66c2)", textDecoration: "none" }}>Open full size ↗</a>}
              </div>
            </div>
            <ToggleFields fields={applicantFields} editing={appEditing} onEdit={() => setEditSec("applicant")} />
          </PanelCard>

          <PanelCard title="Sign-in & credentials" right={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {!r.accountId ? <span style={{ font: `600 11px ${F_SANS}`, color: "var(--muted2,#9aa0a6)" }}>no account linked</span>
                : !r.hasGologin ? <button onClick={(e) => { e.stopPropagation(); void provisionGologin(r); }} disabled={busy} title="Create the GoLogin profile, assign a proxy, and generate the share link" style={{ font: `700 11px ${F_SANS}`, color: "#fff", background: "var(--st-active-fg,#188038)", border: "none", padding: "5px 10px", borderRadius: 8, cursor: busy ? "wait" : "pointer", whiteSpace: "nowrap" }}>{busy ? "Creating…" : "+ Create GoLogin"}</button>
                  : <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {r.gologinShareLink ? <a href={liHref(r.gologinShareLink)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ font: `600 11px ${F_SANS}`, color: "var(--link,#0a66c2)", textDecoration: "none" }}>↗ Open</a> : <span style={{ font: `600 11px ${F_SANS}`, color: "var(--muted,#8a97ad)" }}>GoLogin ready</span>}
                      <button onClick={(e) => { e.stopPropagation(); void deleteGologin(r); }} disabled={busy} title="Delete the GoLogin profile, clear its share link, unassign the proxy" style={{ font: `600 11px ${F_SANS}`, color: "var(--danger,#c0392b)", background: "transparent", border: "none", padding: 0, cursor: busy ? "wait" : "pointer" }}>Delete</button>
                    </div>}
              {r.accountId && editToggle("cred", credEditing)}
            </div>
          }>
            <div><div style={{ ...labelCss, marginBottom: 6 }}>Status</div><RestrictionControl r={r} onAccount={acctSave} onApp={(patch) => patchApp(r.id, patch)} onDeleteEvent={(at) => { if (r.accountId) deleteRestrictionEvent(r.accountId, at); }} /></div>
            {r.accountId ? (<>
              {r.twoFactor && <TotpCode key={r.twoFactor} secretKey={r.twoFactor} />}
              {needsGologin(r) && !r.hasGologin && <div style={{ font: `600 11px ${F_SANS}`, color: "var(--warn-badge-text,#b7791f)" }}>⚠ No GoLogin — this account cannot be run</div>}
              <ToggleFields fields={credFields} editing={credEditing} onEdit={() => setEditSec("cred")} />
            </>) : (
              <div style={{ font: `500 12px ${F_SANS}`, color: "var(--muted,#888)", lineHeight: 1.5 }}>No account linked yet — link one on Inventory once they&apos;ve handed over the login (matched by LinkedIn URL or an “Owner: email” note), then GoLogin, proxy, 2FA and pricing open up here.</div>
            )}
          </PanelCard>
        </div>

        {/* ── Middle column: Chase an issue · Activity ── */}
        <div style={col}>
          <PanelCard title="Chase an issue">
            <PipelineIssueActions referrerResumeUrl={r.referrerResumeUrl} id={r.id} name={r.fullName} profile={r.linkedinUrl} lvEmail={r.loginEmail}
              ambassador={ambassadorIssueContact(r.email, r.contactNumber, r.contactChannel, r.location)} referrer={r.referrer}
              onboarded={onboarded} onSent={() => void workflow(r.id, {})} />
            {!!r.onboardingFix?.issues.length && <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {r.onboardingFix.issues.map(issue => <button key={issue} style={btnSec} disabled={busy} onClick={() => {
                const remaining = r.onboardingFix!.issues.filter(value => value !== issue);
                void workflow(r.id, { setOnboardingFix: remaining.length ? { ...r.onboardingFix, issues: remaining } : null });
              }}>{r.onboardingFix?.state === "referrer_done" ? "Reported fixed" : "Open"}: {({ application_incomplete: "Application not complete", email_added: "Email not added", email_primary: "Email not primary", twofa: "2FA", password: "Password" })[issue]} · Mark resolved</button>)}
            </div>}
            {r.referredBy && <a href={`/admin/referrals?ref=${encodeURIComponent(r.referredBy)}`} style={{ font: `700 12px ${F_SANS}`, color: "var(--link,#0a66c2)", textDecoration: "none" }}>View referrer →</a>}
          </PanelCard>

          <PanelCard title="Activity">
            {meetings.size > 0 && <div style={{ padding: "8px 10px", background: "var(--link-bg,#eaf1ff)", borderRadius: 8, font: `500 11.5px ${F_SANS}`, color: "var(--fg,#111)" }}>
              <b>Meeting booked</b>
              {(() => { const ms = [...meetings.values()].sort((a, b) => b.scheduledAt!.localeCompare(a.scheduledAt!)); return <>{ms.slice(0, 3).map(meeting => <div key={meeting.bookingKey} style={{ marginTop: 4 }}><time dateTime={meeting.scheduledAt}>{new Date(meeting.scheduledAt!).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time>{meeting.cancelled && " · Cancelled"}</div>)}{ms.length > 3 && <div style={{ marginTop: 4, color: "var(--muted2,#9aa0a6)" }}>+{ms.length - 3} earlier</div>}</>; })()}
            </div>}
            <OutreachLog r={r} busy={busy} onLog={logTouch} onSetFollowUp={(iso) => patchApp(r.id, { nextFollowUp: iso })} onDelete={(at) => patchApp(r.id, { removeTouch: at }, true)} />
          </PanelCard>
        </div>

        {/* ── Right column: Payout · Payments · Admin notes ── */}
        <div style={col}>
          <PanelCard title="Payout" right={editToggle("payout", payEditing)}>
            <ToggleFields fields={payoutFields} editing={payEditing} onEdit={() => setEditSec("payout")} />
          </PanelCard>

          <PanelCard title="Payments" right={<span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted,#5b6779)" }}>Total paid <b style={{ font: `700 13px ${F_GRO}`, color: "var(--st-active-fg,#15803d)" }}>{formatMoney(totalPaid(r), cfg.currency)}</b></span>}>
            {payRow(
              `Setup fee · ${formatMoney(cfg.setupAmount, cfg.currency)}`,
              setupDone ? `Paid ${fmtDate(setupPay?.paidAt || r.paidAt)}` : live ? "Owed now that they're onboarded" : "Owed once they're onboarded",
              <span style={pill(setupDone ? "✓ Paid" : live ? "Due" : "After onboarding", setupDone)}>{setupDone ? "✓ Paid" : live ? "Due" : "After onboarding"}</span>
            )}
            {payRow(
              `Monthly · ${formatMoney(monthlyAmt(r), cfg.currency)}/mo`,
              "First weekday of the month, after a full month live",
              <span style={pill(monthlyStarted ? "Active" : "Not started", monthlyStarted)}>{monthlyStarted ? "Active" : "Not started"}</span>
            )}
            <a href="/admin/balances" style={{ font: `700 12px ${F_SANS}`, color: "var(--link,#0a66c2)", textDecoration: "none" }}>Pay, attach receipts &amp; full history in Payouts →</a>
          </PanelCard>

          {(r.accountId || r.adminNotes || r.applicationNotes || r.accountNotes) && (
            <PanelCard title="Admin notes" tone="notes">
              {r.adminNotes && <div style={{ font: `500 12.5px/1.55 ${F_SANS}`, color: "var(--fg,#444)", whiteSpace: "pre-wrap" }}>{r.adminNotes}</div>}
              {r.applicationNotes && <Note label="Application notes">{r.applicationNotes}</Note>}
              {r.accountId && <AccountNotes accountId={r.accountId} notes={r.accountNotes} proof={null} sharedLog={r.outreachLog} onNotesSaved={() => void workflow(r.id, {})} onProofSaved={async () => {}} />}
            </PanelCard>
          )}
        </div>
      </div>

      {/* ── Footer: accept / onboarded state + delete ── */}
      {!live ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, paddingTop: 14, marginTop: 16, borderTop: "1px solid var(--divider,#eee)", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {r.status !== "approved" && r.status !== "onboarding" && <button onClick={() => workflow(r.id, { status: "onboarding", applicationReceived: true })} disabled={busy} title="They've agreed — start onboarding (Level 1 · add email & 2FA)" style={{ ...btnPrimary, background: "var(--st-active-fg,#188038)" }}>✓ Accept → Level 1</button>}
          </div>
          <span style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted2,#9aa0a6)" }}>Accepting reveals the inventory profile · other states from the status dropdown</span>
        </div>
      ) : onboarded ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 14, marginTop: 16, borderTop: "1px solid var(--divider,#eee)" }}>
          <span style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted,#8a9099)" }}>Onboarding complete — warm-up and setup are done. Use the status dropdown to move them back into the pipeline.</span>
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <button onClick={() => onDeleteApp(r)} disabled={busy} title="Permanently delete this application" style={{ font: `600 11px ${F_SANS}`, color: "var(--danger,#c0392b)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>Delete application</button>
      </div>
    </div>
  );
}

// Re-exports the new page also uses for the collapsed row.
export { initialsOf, stageOf, isBlocked, levelKey, healthOf, STATUS_STYLE, STAGE_ACCENT, HEALTH_OPTIONS, applicationType, fmtDate, ageDays, liHref, nextStep, formatName, isLikelyTestEmail };
export type { Status as PipelineStatus, Health as PipelineHealth };
