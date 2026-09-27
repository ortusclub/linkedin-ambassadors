"use client";
import { useEffect, useState } from "react";
import { useMeetingTimeZone } from "@/components/use-meeting-time-zone";
type Booking = { sequence?: number; startsAt: string; invitationSent: boolean };
export function MeetingBooker({ token, email, applicationId, startRescheduling = false, onBooked }: { token?: string; email: string; applicationId?: string; startRescheduling?: boolean; onBooked?: () => void }) {
  const { timeZone, setTimeZone } = useMeetingTimeZone();
  const dateLabel = (iso: string) => new Date(iso).toLocaleDateString("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" });
  const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  const zones = [...new Set([timeZone, "Asia/Manila", "UTC", ...Intl.supportedValuesOf("timeZone")])];
  const [rescheduling, setRescheduling] = useState(startRescheduling);
  const [slots, setSlots] = useState<string[]>([]), [day, setDay] = useState("");
  const [selected, setSelected] = useState(""), [booking, setBooking] = useState<Booking | null>(null);
  const [challenge, setChallenge] = useState(""), [code, setCode] = useState(""), [permit, setPermit] = useState("");
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const endpoint = applicationId ? `/api/meetings?applicationId=${encodeURIComponent(applicationId)}` : "/api/meetings";
  const load = async (changing = rescheduling) => {
    const res = await fetch(changing ? `${endpoint}${endpoint.includes("?") ? "&" : "?"}reschedule=1` : endpoint, { headers, cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setSlots(data.slots); setBooking(data.booking);
  };
  useEffect(() => { void load().catch(e => setError(e.message)).finally(() => setLoading(false)); }, [token, applicationId]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (fn: () => Promise<void>) => { setBusy(true); setError(""); try { await fn(); } catch(e) { setError(e instanceof Error ? e.message : "Please try again."); } finally { setBusy(false); } };
  const verify = async (action: "send" | "check") => {
    const res = await fetch("/api/self-onboarding/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, email, challenge, code }) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error);
    if (data.challenge) setChallenge(data.challenge); if (data.permit) setPermit(data.permit);
  };
  const button = "rounded-lg bg-[#00A150] px-4 py-3 font-semibold text-white disabled:opacity-50";
  const days = [...new Set(slots.map(dateLabel))];
  return <div className="mt-5 rounded-xl bg-white p-5 text-left text-gray-900">
    <h3 className="text-lg font-bold">{rescheduling ? "Reschedule your onboarding call" : "Book your 30-minute onboarding call"}</h3>
    <p className="my-2 text-sm text-gray-600">Availability is Monday–Friday, 9 am–5 pm in the Philippines. Dates and times below are shown in {timeZone.replaceAll("_", " ")}. We’ll call using the contact details on your application.</p>
    <label className="mt-3 block text-sm font-semibold">Time zone<select aria-label="Time zone" className="mt-1 w-full rounded-lg border p-3" value={timeZone} onChange={e => { setTimeZone(e.target.value); setDay(""); setSelected(""); }}>{zones.map(zone => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}</select></label>
    {booking && !rescheduling ? <div role="status" className="mt-4 rounded-lg bg-green-50 p-4"><strong>Booked: {dateLabel(booking.startsAt)}, {timeLabel(booking.startsAt)}</strong><p className="mt-2 text-sm">{booking.invitationSent ? "Calendar invitations have been emailed to you and LinkedVelocity." : "Your time is reserved. Your calendar invitations are queued for delivery."} The booking is linked to your application.</p><p className="mt-2 text-sm">To cancel, email <a className="underline" href="mailto:info@linkedvelocity.com">info@linkedvelocity.com</a>.</p><button className={`${button} mt-3`} disabled={busy} onClick={() => void run(async () => { await load(true); setRescheduling(true); })}>Reschedule meeting</button></div> : <>
      {rescheduling && booking && <p className="mt-2 text-sm">Current booking: {dateLabel(booking.startsAt)}, {timeLabel(booking.startsAt)}. It stays reserved until you confirm a new time. Your previous time will then be released, and both parties will receive an updated calendar invitation.</p>}
      {loading ? <p>Checking availability…</p> : !slots.length ? <p>No times available right now. <button className="underline" onClick={() => void run(() => load())}>Check again</button></p> : <>
        <label className="mt-4 block text-sm font-semibold">Day<select aria-label="Meeting day" className="mt-1 w-full rounded-lg border p-3" value={day} disabled={busy} onChange={e => { setDay(e.target.value); setSelected(""); }}><option value="">Choose a day</option>{days.map(d => <option key={d}>{d}</option>)}</select></label>
        {day && <label className="mt-3 block text-sm font-semibold">Time<select aria-label="Meeting time" className="mt-1 w-full rounded-lg border p-3" value={selected} disabled={busy} onChange={e => setSelected(e.target.value)}><option value="">Choose a time</option>{slots.filter(s => dateLabel(s) === day).map(s => <option key={s} value={s}>{timeLabel(s)}</option>)}</select></label>}
        {selected && !permit && !applicationId && <div className="mt-4"><p className="mb-2 text-sm">Verify {email} to receive your invitation.</p><button className={button} disabled={busy} onClick={() => void run(() => verify("send"))}>{challenge ? "Send a new code" : "Email me a verification code"}</button>{challenge && <div className="mt-3 flex flex-wrap gap-2"><input aria-label="Email verification code" className="min-w-0 rounded-lg border p-3" value={code} maxLength={6} inputMode="numeric" autoComplete="one-time-code" onChange={e => setCode(e.target.value)} placeholder="6-digit code" /><button className={button} disabled={busy || code.length !== 6} onClick={() => void run(() => verify("check"))}>Verify email</button></div>}</div>}
        {(permit || applicationId) && <button className={`${button} mt-4 w-full`} disabled={busy || !selected} onClick={() => void run(async () => {
          const res = await fetch(endpoint, { method: rescheduling ? "PUT" : "POST", headers, body: JSON.stringify({ startsAt: selected, permit, sequence: booking?.sequence || 0 }) }); const data = await res.json();
          if (!res.ok) { if (res.status === 409) { await load(); setSelected(""); } if (res.status === 403) setPermit(""); throw new Error(data.error); }
          setBooking(data.booking); setRescheduling(false); onBooked?.();
        })}>{busy ? "Saving…" : rescheduling ? "Confirm new time" : "Confirm booking"}</button>}
      </>}
    </>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </div>;
}
