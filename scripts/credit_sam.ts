import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "sam@ortusclub.asia";
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, fullName: true, usdcBalance: true },
  });
  if (!user) {
    console.log(`User not found: ${email}`);
    return;
  }
  console.log(`Before: ${user.fullName} (${user.email}) — balance: ${user.usdcBalance}`);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { usdcBalance: { increment: 300 } },
    select: { usdcBalance: true },
  });
  console.log(`After:  balance: ${updated.usdcBalance}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
