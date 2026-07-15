import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";

// The Blob write token lives in .env.production.local (real value), while the
// prod DATABASE_URL is in .env. Load the token here if it isn't already set.
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  try {
    const m = readFileSync(".env.production.local", "utf8").match(/BLOB_READ_WRITE_TOKEN="?([^"\n]+)/);
    if (m) process.env.BLOB_READ_WRITE_TOKEN = m[1].replace(/\\n$/, "").trim();
  } catch {}
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PERMANENT_HOST = ".public.blob.vercel-storage.com";

async function main() {
  const accounts = await prisma.linkedInAccount.findMany({
    where: { profilePhotoUrl: { not: null } },
    select: { id: true, linkedinName: true, profilePhotoUrl: true },
  });

  const rescued: string[] = [];
  const expired: string[] = [];
  const skipped: string[] = [];

  for (const a of accounts) {
    const url = a.profilePhotoUrl!;
    if (url.includes(PERMANENT_HOST) || url.startsWith("data:")) {
      skipped.push(a.linkedinName);
      continue;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) {
        expired.push(`${a.linkedinName} (HTTP ${res.status})`);
        continue;
      }
      const contentType = res.headers.get("content-type") || "image/jpeg";
      const ext = (contentType.split("/")[1] || "jpg").split(";")[0].replace("jpeg", "jpg");
      const blob = await put(`profile-${randomUUID()}.${ext}`, await res.arrayBuffer(), {
        access: "public",
        contentType,
      });
      await prisma.linkedInAccount.update({
        where: { id: a.id },
        data: { profilePhotoUrl: blob.url },
      });
      rescued.push(a.linkedinName);
      console.log(`✓ rescued  ${a.linkedinName}`);
    } catch (err) {
      expired.push(`${a.linkedinName} (${err instanceof Error ? err.message : String(err)})`);
    }
  }

  console.log(`\n===== SUMMARY =====`);
  console.log(`Rescued to Blob (${rescued.length}):`, rescued.join(", ") || "—");
  console.log(`Already permanent, skipped (${skipped.length}):`, skipped.join(", ") || "—");
  console.log(`\n⚠ EXPIRED — need a fresh photo pulled from the live profile (${expired.length}):`);
  expired.forEach((e) => console.log("   - " + e));
}

main().catch(console.error).finally(() => prisma.$disconnect());
