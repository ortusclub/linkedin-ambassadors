"use client";
import { useEffect, useState } from "react";
const KEY = "meeting-time-zone";
const EVENT = "meeting-time-zone-changed";
function preferredZone() {
  try {
    const zone = localStorage.getItem(KEY) || Intl.DateTimeFormat().resolvedOptions().timeZone;
    new Intl.DateTimeFormat("en", { timeZone: zone }).format();
    return zone;
  } catch { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Manila"; }
}
export function useMeetingTimeZone() {
  const [timeZone, setZone] = useState("Asia/Manila");
  useEffect(() => {
    const update = (event?: Event) => setZone(event instanceof CustomEvent ? event.detail : preferredZone());
    update(); window.addEventListener(EVENT, update); window.addEventListener("storage", update);
    return () => { window.removeEventListener(EVENT, update); window.removeEventListener("storage", update); };
  }, []);
  const setTimeZone = (zone: string) => {
    setZone(zone);
    try { localStorage.setItem(KEY, zone); } catch { /* Preference still works for this view. */ }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: zone }));
  };
  return { timeZone, setTimeZone };
}
