import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create admin user
  const adminPassword = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@linkedinambassadors.com" },
    update: {},
    create: {
      email: "admin@linkedinambassadors.com",
      passwordHash: adminPassword,
      fullName: "Admin User",
      role: "admin",
      status: "active",
    },
  });
  console.log("Admin user created:", admin.email);

  // Create sample LinkedIn accounts
  const accounts = [
    {
      linkedinName: "Sarah Johnson",
      linkedinHeadline: "VP of Sales at TechCorp | 15+ Years in Enterprise Sales",
      connectionCount: 8500,
      industry: "Technology",
      location: "San Francisco, CA",
      accountAgeMonths: 144,
      hasSalesNav: true,
      status: "available" as const,
    },
    {
      linkedinName: "Michael Chen",
      linkedinHeadline: "Director of Marketing at CloudScale | Growth & Demand Gen",
      connectionCount: 5200,
      industry: "SaaS",
      location: "New York, NY",
      accountAgeMonths: 96,
      hasSalesNav: false,
      status: "available" as const,
    },
    {
      linkedinName: "Emily Rodriguez",
      linkedinHeadline: "Head of Business Development at FinanceHub",
      connectionCount: 12000,
      industry: "Finance",
      location: "Chicago, IL",
      accountAgeMonths: 168,
      hasSalesNav: true,
      status: "available" as const,
    },
    {
      linkedinName: "James Wilson",
      linkedinHeadline: "Senior Account Executive at DataDriven",
      connectionCount: 3800,
      industry: "Data Analytics",
      location: "Austin, TX",
      accountAgeMonths: 72,
      hasSalesNav: false,
      status: "available" as const,
    },
    {
      linkedinName: "Lisa Park",
      linkedinHeadline: "CEO at HealthTech Solutions | Digital Health Innovator",
      connectionCount: 15000,
      industry: "Healthcare",
      location: "Boston, MA",
      accountAgeMonths: 180,
      hasSalesNav: true,
      status: "available" as const,
    },
    {
      linkedinName: "David Thompson",
      linkedinHeadline: "Principal Consultant at StrategyFirst",
      connectionCount: 6700,
      industry: "Consulting",
      location: "London, UK",
      accountAgeMonths: 120,
      hasSalesNav: false,
      status: "available" as const,
    },
  ];

  for (const account of accounts) {
    await prisma.linkedInAccount.create({ data: account });
  }

  console.log(`Created ${accounts.length} sample LinkedIn accounts`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
