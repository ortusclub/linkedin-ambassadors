// Google Calendar appointment descriptions contain a Booked by block.
// Match its email before attributing the name/number to an attendee.
export function bookingContact(description: string, email: string): { name?: string; phone?: string } {
  const lines = description.replace(/<br\s*\/?>(?:\r?\n)?/gi, "\n").replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&#39;|&apos;/gi, "'").replace(/&quot;/gi, '"')
    .split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const start = lines.findIndex(line => /^Booked by:?$/i.test(line));
  if (start < 0 || lines[start + 2]?.toLowerCase() !== email.trim().toLowerCase()) return {};
  const name = lines[start + 1]?.replace(/\s+/g, " ");
  const phone = lines[start + 3];
  return {
    ...(name && !name.includes("@") && name.length <= 200 ? { name } : {}),
    ...(phone && /^\+?[\d ()\-.]{7,25}$/.test(phone) && phone.replace(/\D/g, "").length >= 7 ? { phone } : {}),
  };
}
