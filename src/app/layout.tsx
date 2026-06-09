import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ScrollReveal } from "@/components/scroll-reveal";
import { JsonLd } from "@/components/seo/json-ld";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "LinkedVelocity — Rent Premium LinkedIn Accounts for Outreach",
    template: "%s | LinkedVelocity",
  },
  description:
    "Rent pre-warmed, verified LinkedIn accounts for outreach, lead generation, and networking. Instant access via GoLogin browser. Cancel anytime. From $10/month.",
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
      "Rent pre-warmed, verified LinkedIn accounts for outreach and lead generation. Instant access, cancel anytime. From $10/month.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LinkedVelocity - Rent Premium LinkedIn Accounts",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkedVelocity — Rent Premium LinkedIn Accounts",
    description:
      "Rent pre-warmed LinkedIn accounts for outreach and lead gen. Instant access, cancel anytime.",
    images: ["/og-image.png"],
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
        <a
          href="https://t.me/linkedvelocity_support_bot"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on Telegram"
          style={{position:'fixed',bottom:24,right:24,zIndex:50,width:56,height:56,borderRadius:'50%',background:'#0088cc',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(0,0,0,0.2)',textDecoration:'none',transition:'transform 0.2s,box-shadow 0.2s'}}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
        </a>
      </body>
    </html>
  );
}
