import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Klabber — Rent Premium LinkedIn Accounts",
  description:
    "Browse, select, and rent pre-configured LinkedIn accounts for outreach, lead gen, and networking. Instant access, cancel anytime.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-gray-50`}>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
