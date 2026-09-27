import type { Metadata } from "next";
import OwnerSignInCode from "@/components/owner-sign-in-code";
import styles from "../guide/primary-email/primary-email.module.css";
export const metadata: Metadata = { title: "Your LinkedIn sign-in code · LinkedVelocity", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function Page() {
  return <main className={styles.page}><header className={styles.hero}><div className={styles.eyebrow}>LINKEDVELOCITY · ACCOUNT ACCESS</div><h1>Get your six-digit code</h1><p>Sign in to your LinkedIn account without revealing the 2FA setup key.</p></header><OwnerSignInCode /></main>;
}
