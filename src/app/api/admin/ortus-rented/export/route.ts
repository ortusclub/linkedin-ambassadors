import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// CSV export of the accounts info@ortus.solutions rents on LinkedVelocity — its Ortus
// pool (auto-owned) AND any general-inventory accounts it shadow-rents — laid out to
// match the "LV Rented Accounts" tab of the SoO sheet. Google Sheets pulls it via
//   =IMPORTDATA("https://linkedvelocity.com/api/admin/ortus-rented/export?key=XXXX")
// placed in A2 (the tab keeps its own header row 1). Auth is the shared RENTALS_EXPORT_KEY
// in the URL (IMPORTDATA can't send headers) — keep it private.
//
// NOTE: credential columns (Passwords, 2fa) are intentionally left blank here. Exporting
// decrypted secrets over a URL-keyed feed is handled separately; see the request notes.
export const dynamic = "force-dynamic";

const OWNER_EMAIL = "info@ortus.solutions";
const COLS = 56; // A..BD of the "LV Rented Accounts" tab

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function statusLabel(a: { status: string; restrictedAt: Date | null }): string {
  if (a.restrictedAt) return "Restricted";
  if (a.status === "rented") return "Rented";
  if (a.status === "available") return "Available";
  if (a.status === "under_construction") return "Construction";
  if (a.status === "trial") return "Trial";
  return a.status;
}

export async function GET(req: NextRequest) {
  // Accept a dedicated key for this feed, or fall back to the shared inventory key.
  const key = req.nextUrl.searchParams.get("key");
  const accepted = [process.env.ORTUS_RENTED_EXPORT_KEY, process.env.RENTALS_EXPORT_KEY]
    .map((k) => (k || "").trim())
    .filter(Boolean);
  if (!accepted.length || !key || !accepted.includes(key.trim())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owner = await prisma.user.findFirst({
    where: { email: { equals: OWNER_EMAIL, mode: "insensitive" } },
    select: { id: true },
  });

  const rentals = owner
    ? await prisma.rental.findMany({
        where: { userId: owner.id, status: { in: ["active", "pending_access", "payment_failed"] } },
        include: {
          linkedinAccount: {
            select: {
              loginEmail: true, personalEmail: true, workEmail: true,
              linkedinName: true, linkedinUrl: true, linkedinVerified: true,
              gologinShareLink: true, notes: true, connectionCount: true,
              location: true, status: true, restrictedAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const rows = rentals.map((r) => {
    const a = r.linkedinAccount;
    const parts = (a.linkedinName || "").trim().split(/\s+/).filter(Boolean);
    const row = new Array(COLS).fill("");
    row[0] = a.loginEmail || a.personalEmail || "";                    // A Email
    row[1] = statusLabel(a);                                           // B Status
    row[2] = r.isShadow ? "Shadow" : "Ortus pool";                    // C Type
    row[3] = parts[0] || "";                                           // D First Name
    row[4] = parts.length > 1 ? parts[parts.length - 1] : "";          // E Last Name
    row[5] = a.linkedinName || "";                                     // F Full Name
    row[6] = a.linkedinUrl || "";                                      // G Linkedin Profile URL
    // H Passwords — left blank (credential export handled separately)
    row[8] = OWNER_EMAIL;                                              // I Assignee
    row[9] = a.linkedinVerified ? "Yes" : "No";                       // J Verified
    row[15] = a.gologinShareLink ? "Y" : "N";                        // P GoLogin (Y/N)
    row[16] = a.notes || "";                                          // Q Notes
    row[17] = a.workEmail || "";                                      // R 2nd email
    row[20] = a.personalEmail || "";                                 // U Alias/Main Email
    row[21] = a.connectionCount > 0 ? String(a.connectionCount) : ""; // V # of Connections
    // Y 2fa — left blank (credential export handled separately)
    row[42] = a.location || "";                                       // AQ Account Location
    row[46] = "Y";                                                    // AU LinkedVelocity
    return row;
  });

  // IMPORTDATA errors on an empty body, so emit one labelled row when nothing is rented
  // yet (keeps the formula alive instead of showing #N/A).
  if (rows.length === 0) {
    const blank = new Array(COLS).fill("");
    blank[0] = "(no rented accounts yet)";
    rows.push(blank);
  }

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" },
  });
}
