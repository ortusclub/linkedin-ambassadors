import type { Metadata } from "next";
import Guide from "./restricted-guide";
export const metadata: Metadata = { title: "Recover a restricted LinkedIn account · LinkedVelocity", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function Page() { return <Guide />; }
