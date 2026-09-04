// One-off: read a user's balance, and (with APPLY=1) add USDC credit + an
// `adjustment` transaction row for the audit trail. Usage:
//   npx tsx scripts/credit_user.ts <email> <amount>        # dry run
//   APPLY=1 npx tsx scripts/credit_user.ts <email> <amount>
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2];
  const amount = Number(process.argv[3]);
  if (!email || !Number.isFinite(amount)) throw new Error("usage: credit_user.ts <email> <amount>");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, fullName: true, status: true, usdcBalance: true, createdAt: true },
  });
  if (!user) { console.log(`User not found: ${email}`); return; }
  console.log("Found:", user);

  if (process.env.APPLY !== "1") { console.log(`DRY RUN — would add $${amount}. Re-run with APPLY=1 to write.`); return; }

  const [updated] = await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { usdcBalance: { increment: amount } }, select: { usdcBalance: true } }),
    prisma.transaction.create({ data: { userId: user.id, type: "adjustment", amount, description: `Manual credit: $${amount}` } }),
  ]);
  console.log(`After: balance ${updated.usdcBalance}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
