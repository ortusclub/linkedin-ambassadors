"use client";
import OwnerSignInCode from "@/components/owner-sign-in-code";
import styles from "../primary-email/primary-email.module.css";
const BOOK = "https://calendly.com/linkedvelocity-info/30min";
export default function Guide() {
  return <main className={styles.page}>
    <section className={styles.card}><p>LINKEDVELOCITY · ACCOUNT HELP</p><h1 style={{fontSize:"clamp(30px, 6vw, 48px)",lineHeight:1.2,fontWeight:800}}>Recover your restricted LinkedIn account</h1><p>The account owner needs to complete LinkedIn’s recovery process. A referral partner can help with these instructions, but the owner must complete any identity check.</p></section>
    <section className={styles.card}><h2>1. Sign in to your account</h2><p>Open <a href="https://www.linkedin.com/login">LinkedIn’s sign-in page</a> or its official app. Use your original email and existing password if that email is still attached and the password has not changed. You can also use the LV email listed in our message if it remains attached.</p><p>If LinkedIn asks for 2FA, use your authenticator or the verified-owner code tool below. If your password no longer works, follow LinkedIn’s password recovery instructions.</p></section>
    <section className={styles.card}><h2>2. Follow the restriction notice</h2><p>Read the instructions LinkedIn displays. Complete the recovery or review steps offered there. If you are asked to verify your identity, continue through LinkedIn’s official verification flow.</p></section>
    <section className={styles.card}><h2>3. Complete identity verification if requested</h2><p>LinkedIn may use Persona to verify the owner’s identity. Follow the prompts, use your phone if instructed, and provide the requested valid ID and photo directly in that flow. Do not send identity documents to LinkedVelocity.</p><p><a href="https://www.linkedin.com/help/linkedin/answer/a1339720">LinkedIn’s official identity recovery tutorial →</a></p><p>Follow the status and next steps LinkedIn provides. If you cannot access your email or complete the flow, see <a href="https://www.linkedin.com/help/linkedin/answer/a1376104">LinkedIn’s account recovery help</a> or book a call below. Recovery depends on LinkedIn’s review.</p></section>
    <section className={styles.card}><h2>4. Tell us when the restriction is cleared</h2><p>Reply to our email or message us. Our team will test account access. Once we confirm access is restored, your monthly LinkedVelocity payments will resume.</p></section>
    <OwnerSignInCode />
    <section className={styles.help}><h2>Option 2: Resolve it together</h2><p>Book a call with our team and we will help you follow the recovery steps.</p><a href={BOOK}>Book a help call →</a></section>
  </main>;
}
