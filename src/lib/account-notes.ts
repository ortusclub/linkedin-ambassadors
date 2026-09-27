export type AccountNote = { text: string; at: string | null; source: "account" | "private" };

// Split only explicit date markers at the start of a line. Dates mentioned inside
// prose are not reliable creation dates; preserve that text as an undated entry.
export function accountNotesTimeline(notes?: string | null, proof?: string | null): AccountNote[] {
  const result: AccountNote[] = [];
  for (const [source, value] of [["account", notes], ["private", proof]] as const) {
    let current: AccountNote | null = null;
    for (const line of (value || "").split(/\r?\n/)) {
      const match = line.match(/^\[(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)?)\]\s*(.*)$/);
      if (match && Number.isFinite(Date.parse(match[1]))) {
        if (current?.text.trim()) result.push({ ...current, text: current.text.trim() });
        current = { at: match[1], text: match[2], source };
      } else if (current) current.text += `\n${line}`;
      else current = { at: null, text: line, source };
    }
    if (current?.text.trim()) result.push({ ...current, text: current.text.trim() });
  }
  return result.map((note, order) => ({ ...note, order })).sort((a, b) =>
    (b.at ? Date.parse(b.at) : -Infinity) - (a.at ? Date.parse(a.at) : -Infinity) || b.order - a.order
  ).map(({ order: _order, ...note }) => note);
}
