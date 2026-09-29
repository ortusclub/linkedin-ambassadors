import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SupportBubble } from "@/components/layout/support-bubble";
import { ScrollReveal } from "@/components/scroll-reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { getBrand } from "@/lib/brand";

const inter = Inter({ subsets: ["latin"] });

// Per-brand metadata: resolved from the request host so linkedvelocity.com and
// linkedreps.io each get their own title, description, canonical/OG domain and icons.
export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  const m = brand.meta;
  return {
    title: {
      default: m.titleDefault,
      template: m.titleTemplate,
    },
    description: m.description,
    keywords: m.keywords,
    authors: [{ name: brand.name }],
    creator: brand.name,
    publisher: brand.name,
    metadataBase: new URL(brand.url),
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: brand.url,
      siteName: brand.name,
      title: m.ogTitle,
      description: m.ogDescription,
      images: [
        {
          url: brand.ogImage,
          width: 1200,
          height: 630,
          alt: m.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: m.twitterTitle,
      description: m.twitterDescription,
      images: [brand.ogImage],
    },
    icons: {
      icon: brand.favicon,
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
}

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
