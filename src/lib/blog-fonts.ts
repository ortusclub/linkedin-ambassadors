import { Poppins, Inter, JetBrains_Mono } from "next/font/google";

// Public blog brand fonts (distinct from the app). Scoped to the blog via a wrapper
// so they don't leak into the shared navbar/footer.
export const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-poppins", display: "swap" });
export const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap" });
export const jbmono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-jbmono", display: "swap" });
export const blogFontVars = `${poppins.variable} ${inter.variable} ${jbmono.variable}`;

// category -> [pill bg, text]. Covers the real DB categories + the design's set.
export const CAT_COLOR: Record<string, [string, string]> = {
  "LinkedIn Strategy": ["#E7F0FB", "#0A66C2"],
  "Sales Strategy": ["#EDEBFB", "#5747C9"],
  "Tools": ["#E4F6EC", "#067A45"],
  "LinkedIn Compliance": ["#FBF1DE", "#946011"],
  "Compliance": ["#FBF1DE", "#946011"],
  "LinkedIn Limits": ["#DEF3F1", "#0E7C74"],
  "Deliverability": ["#DEF3F1", "#0E7C74"],
  "Getting Started": ["#E9F7EF", "#0A7A45"],
  "Ambassadors": ["#E9F7EF", "#0A7A45"],
  "Market & Competitive": ["#FBE9EC", "#B23150"],
  "Case Studies": ["#FBE9EC", "#B23150"],
};
export const catColor = (c: string): [string, string] => CAT_COLOR[c] || ["#EEF1F5", "#5A6473"];
