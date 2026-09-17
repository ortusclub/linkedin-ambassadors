import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SupportBubble } from "@/components/layout/support-bubble";
import { ScrollReveal } from "@/components/scroll-reveal";
import { JsonLd } from "@/components/seo/json-ld";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "LinkedVelocity — Rent Premium LinkedIn Accounts for Outreach",
    template: "%s | LinkedVelocity",
  },
  description:
    "Rent pre-warmed, verified LinkedIn accounts for outreach, lead generation, and networking. Instant access via GoLogin browser. Cancel anytime. From $45/month.",
  keywords: [
    "rent LinkedIn account",
    "LinkedIn account rental",
    "LinkedIn outreach",
    "LinkedIn lead generation",
    "buy LinkedIn accounts",
    "LinkedIn account marketplace",
    "GoLogin LinkedIn",
    "LinkedIn automation",
    "B2B outreach",
    "sales prospecting LinkedIn",
  ],
  authors: [{ name: "LinkedVelocity" }],
  creator: "LinkedVelocity",
  publisher: "LinkedVelocity",
  metadataBase: new URL("https://linkedvelocity.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://linkedvelocity.com",
    siteName: "LinkedVelocity",
    title: "LinkedVelocity — Rent Premium LinkedIn Accounts for Outreach",
    description:
      "Rent pre-warmed, verified LinkedIn accounts for outreach and lead generation. Instant access, cancel anytime. From $45/month.",
    images: [
      {
        url: "/og-image.png?v=2",
        width: 1200,
        height: 630,
        alt: "LinkedVelocity — Scale LinkedIn outreach without the limits",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkedVelocity — Rent Premium LinkedIn Accounts",
    description:
      "Rent pre-warmed LinkedIn accounts for outreach and lead gen. Instant access, cancel anytime.",
    images: ["/og-image.png?v=2"],
  },
  icons: {
    icon: "/favicon.svg",
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://4h5iwfncny2cdhck.public.blob.vercel-storage.com" />
        <link rel="dns-prefetch" href="https://4h5iwfncny2cdhck.public.blob.vercel-storage.com" />
      </head>
      <body className={`${inter.className} antialiased bg-gray-50`}>
        <JsonLd />
        <Navbar />
        <ScrollReveal />
        <main>{children}</main>
        <Footer />
        <SupportBubble />
      </body>
    </html>
  );
}
