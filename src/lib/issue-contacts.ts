export type IssueContact = { email?: string | null; whatsapp?: string | null; telegram?: string | null; viber?: string | null };

export function contactLink(channel: keyof IssueContact, handle: string | null | undefined, message: string): string | null {
  const value = (handle || "").trim();
  if (!value) return null;
  if (channel === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? `mailto:${encodeURIComponent(value)}?subject=${encodeURIComponent("LinkedVelocity: account access issue")}&body=${encodeURIComponent(message)}` : null;
  if (channel === "viber") {
    const phone = value.replace(/^viber:\s*/i, "");
    if (!/^\+?[\d\s().-]+$/.test(phone)) return null;
    const digits = phone.replace(/\D/g, "");
    return /^[1-9]\d{7,14}$/.test(digits) ? `viber://chat?number=${encodeURIComponent("+" + digits)}` : null;
  }
  if (channel === "whatsapp") {
    const phone = value.replace(/^(?:whatsapp|phone):\s*/i, "");
    if (!/^\+?[\d\s().-]+$/.test(phone)) return null;
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 15 && !digits.startsWith("0") ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null;
  }
  const username = value.match(/(?:t\.me\/|@)([a-z][a-z0-9_]{3,31})/i)?.[1] || value.replace(/^telegram:\s*/i, "");
  if (/^[a-z][a-z0-9_]{3,31}$/i.test(username)) return `https://t.me/${username}?text=${encodeURIComponent(message)}`;
  const phone = value.replace(/^telegram:\s*/i, "");
  return /^\+[1-9]\d{7,14}$/.test(phone) ? `https://t.me/${phone}?text=${encodeURIComponent(message)}` : null;
}

export function ambassadorIssueContact(email: string | null, phone: string | null, channel: string | null, location?: string | null): IssueContact {
  const raw = phone || "";
  const method = `${channel || ""} ${raw}`.toLowerCase();
  let viber = /viber/.test(method) ? raw.replace(/^viber:\s*/i, "").trim() : null;
  if (viber && /philippines|\bPH\b|manila/i.test(location || "") && /^09\d{9}$/.test(viber)) viber = "+63" + viber.slice(1);
  return { email, viber, whatsapp: /telegram|viber/.test(method) && !/whatsapp/.test(method) ? null : raw,
    telegram: /telegram|t\.me\/|@/.test(method) ? raw : null };
}
