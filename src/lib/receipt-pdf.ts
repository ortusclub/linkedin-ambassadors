// Dependency-free single-page PDF generator for a simple credit top-up receipt.
// Avoids headless-browser / native PDF deps so it runs reliably on Vercel functions.

export interface ReceiptData {
  receiptNo: string;
  dateISO: string;
  customerName: string;
  customerEmail: string;
  amountUsd: string;   // e.g. "$50.00"
  method: string;      // e.g. "Card" | "Crypto (USDC)"
  reference: string;   // txHash or transaction id
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

// Build a text-showing content stream. Each entry: [x, yFromTop, fontSize, bold, text]
function contentStream(lines: [number, number, number, boolean, string][]): string {
  const PAGE_H = 792; // Letter
  let s = "";
  for (const [x, yTop, size, bold, text] of lines) {
    const y = PAGE_H - yTop;
    const font = bold ? "F2" : "F1";
    s += `BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${esc(text)}) Tj ET\n`;
  }
  // A divider line under the header.
  s += `0.8 w 0.8 0.8 0.8 RG 50 ${792 - 96} m 545 ${792 - 96} l S\n`;
  return s;
}

export function buildReceiptPdf(d: ReceiptData): Uint8Array {
  const date = new Date(d.dateISO).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
  const lines: [number, number, number, boolean, string][] = [
    [50, 60, 22, true, "LinkedVelocity"],
    [50, 80, 11, false, "Credit top-up receipt"],
    [50, 130, 12, true, "Receipt"],
    [50, 150, 11, false, `Receipt no:  ${d.receiptNo}`],
    [50, 168, 11, false, `Date:        ${date}`],
    [50, 200, 12, true, "Billed to"],
    [50, 220, 11, false, d.customerName],
    [50, 238, 11, false, d.customerEmail],
    [50, 280, 12, true, "Payment"],
    [50, 300, 11, false, `Description:  Credit top-up`],
    [50, 318, 11, false, `Method:      ${d.method}`],
    [50, 336, 11, false, `Reference:   ${d.reference}`],
    [50, 372, 14, true, `Amount paid:  ${d.amountUsd}`],
    [50, 720, 9, false, "Thank you. Credits are added to your LinkedVelocity wallet balance."],
    [50, 734, 9, false, "LinkedVelocity  ·  linkedvelocity.com"],
  ];
  const stream = contentStream(lines);

  const objs: string[] = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objs[3] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>";
  objs[4] = `<< /Length ${stream.length} >>\nstream\n${stream}endstream`;
  objs[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objs[6] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 1; i <= 6; i++) {
    offsets[i] = Buffer.byteLength(pdf, "latin1");
    pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xrefPos = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 7\n0000000000 65535 f \n`;
  for (let i = 1; i <= 6; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  return new Uint8Array(Buffer.from(pdf, "latin1"));
}
