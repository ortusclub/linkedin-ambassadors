import type { Metadata } from "next";
import { FieldMarketingForm } from "./field-marketing-form";
import { poppins } from "./fonts";

export const metadata: Metadata = {
  title: "Promo Team Role — Metro Manila | ₱2,000/day + Bonuses",
  description:
    "Join the LinkedVelocity promo team in Metro Manila. Earn ₱2,000/day base plus ₱500 per successful sign-up, uncapped. Flexible, on-call promo work. Apply today.",
  alternates: { canonical: "/promo-team" },
  openGraph: {
    title: "Promo Team Role — Metro Manila | ₱2,000/day + Bonuses",
    description:
      "Earn ₱2,000/day base plus ₱500 per successful sign-up, uncapped. Flexible, on-call promo work in Metro Manila. Apply now.",
    url: "https://linkedvelocity.com/promo-team",
  },
};

const heroBg = {
  background:
    "radial-gradient(80% 60% at 50% -10%, rgba(0,184,92,0.30) 0%, rgba(11,32,24,0) 62%)," +
    "radial-gradient(70% 60% at 88% 10%, rgba(20,160,90,0.20) 0%, rgba(11,32,24,0) 55%)," +
    "radial-gradient(65% 70% at 8% 106%, rgba(0,150,120,0.18) 0%, rgba(11,32,24,0) 60%)," +
    "linear-gradient(180deg, #10432C 0%, #0B2018 100%)",
};

type Perk = {
  stat: string;
  label: string;
  body: string;
  fg: string;
  bg: string;
  icon: React.ReactNode;
};

const perks: Perk[] = [
  {
    stat: "₱2,000",
    label: "per day",
    body: "Guaranteed base pay for every day you work.",
    fg: "#067A45",
    bg: "#E7F6EE",
    icon: (
      <>
        <path d="M12 1v22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
  },
  {
    stat: "",
    label: "Flexible & on-call",
    body: "Work around your own schedule — we let you know when there's a day on.",
    fg: "#0A66C2",
    bg: "#EAF2FC",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
  {
    stat: "₱500",
    label: "per sign-up",
    body: "A bonus for every person who successfully joins — uncapped.",
    fg: "#067A45",
    bg: "#E7F6EE",
    icon: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 11h-6M19 8v6" />
      </>
    ),
  },
  {
    stat: "",
    label: "Uncapped earning",
    body: "No ceiling — the more good sign-ups you bring in, the more you earn.",
    fg: "#0A66C2",
    bg: "#EAF2FC",
    icon: (
      <>
        <path d="M23 6l-9.5 9.5-5-5L1 18" />
        <path d="M17 6h6v6" />
      </>
    ),
  },
];

const about = [
  "Hand out flyers and share your personal sign-up link in the right spots around Metro Manila.",
  "Chat with interested people and help them sign up on the spot.",
  "Every sign-up is tracked to you automatically — earn ₱500 for each person who joins.",
  "Friendly, outgoing, and comfortable approaching people is all you need.",
];

export default function PromoTeamPage() {
  return (
    <div style={{ background: "#FBFCFB" }} className="text-[#0B1220]">
      {/* keyframes for the hero aurora glow */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes lvAurA {0%,100%{transform:translate(0,0) scale(1);opacity:.9}50%{transform:translate(6%,4%) scale(1.12);opacity:1}}
          @keyframes lvAurB {0%,100%{transform:translate(0,0) scale(1);opacity:.8}50%{transform:translate(-5%,3%) scale(1.15);opacity:.95}}
          @media (prefers-reduced-motion: reduce){.lv-aur{animation:none!important}}
        `,
        }}
      />

      {/* green mode bar */}
      <div style={{ height: 4, background: "#00A150" }} />

      {/* HERO */}
      <div style={heroBg} className="relative overflow-hidden px-5 py-16 text-center sm:px-10 sm:py-[70px]">
        <div
          className="lv-aur pointer-events-none absolute"
          style={{
            width: 620,
            height: 620,
            left: -160,
            top: -220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,184,92,0.26), rgba(0,184,92,0) 65%)",
            filter: "blur(20px)",
            animation: "lvAurA 16s ease-in-out infinite",
          }}
        />
        <div
          className="lv-aur pointer-events-none absolute"
          style={{
            width: 560,
            height: 560,
            right: -140,
            bottom: -200,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(20,180,110,0.22), rgba(20,180,110,0) 65%)",
            filter: "blur(20px)",
            animation: "lvAurB 19s ease-in-out infinite",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "38px 38px",
            opacity: 0.4,
            WebkitMaskImage: "radial-gradient(70% 60% at 50% 30%, #000 0%, transparent 75%)",
            maskImage: "radial-gradient(70% 60% at 50% 30%, #000 0%, transparent 75%)",
          }}
        />

        <div className="relative mx-auto max-w-[760px] text-[#EAF6EE]">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-[15px] py-[7px] text-[13px] font-semibold text-[#CFEAD9]">
            <span>📍</span> Metro Manila · Now hiring
          </div>
          <h1
            className={`${poppins.className} mx-auto mb-5 max-w-[600px] text-[40px] font-extrabold leading-[1.04] tracking-[-0.03em] text-white sm:text-[56px]`}
          >
            Join our <span style={{ color: "#4FE08C" }}>promo team</span>
          </h1>
          <p className="mx-auto max-w-[560px] text-[17px] leading-[1.6] text-[#B7D4C4] sm:text-[18.5px]">
            A flexible, on-call role — hand out flyers and share your sign-up link to help people
            start earning from a LinkedIn account they already have. Base pay every day you work,
            plus an uncapped bonus for every person who joins.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-[14px]">
            <a
              href="#promo-apply"
              style={{ background: "#00B85C", boxShadow: "0 14px 32px rgba(0,184,92,0.34)" }}
              className="inline-flex items-center gap-[9px] rounded-xl px-7 py-[15px] text-[16px] font-semibold text-white transition hover:-translate-y-0.5"
            >
              Apply now →
            </a>
            <a
              href="#role"
              className="inline-flex items-center gap-[9px] rounded-xl border border-white/20 bg-white/[0.08] px-7 py-[15px] text-[16px] font-semibold text-[#EAF6EE]"
            >
              See the role
            </a>
          </div>
        </div>
      </div>

      {/* BENEFIT CARDS */}
      <div className="mx-auto max-w-[900px] px-5 pt-14 sm:px-10">
        <div className="grid gap-[18px] sm:grid-cols-2">
          {perks.map((p) => (
            <div
              key={p.label}
              style={{ boxShadow: "0 4px 14px rgba(16,24,40,0.05), 0 1px 3px rgba(16,24,40,0.04)" }}
              className="rounded-[18px] border border-[#E7EBE8] bg-white p-[26px] transition duration-200 hover:-translate-y-[5px] hover:shadow-[0_18px_40px_rgba(16,24,40,0.12)]"
            >
              <div
                style={{ background: p.bg }}
                className="mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-[13px]"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={p.fg}
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {p.icon}
                </svg>
              </div>
              <div className="mb-1.5 flex items-baseline gap-2">
                {p.stat && (
                  <span
                    className={`${poppins.className} text-[22px] font-extrabold tracking-[-0.02em]`}
                    style={{ color: p.fg }}
                  >
                    {p.stat}
                  </span>
                )}
                <span className={`${poppins.className} text-[16px] font-semibold text-[#0B1220]`}>
                  {p.label}
                </span>
              </div>
              <p className="m-0 text-[14.5px] leading-[1.6] text-[#5A6473]">{p.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ABOUT THE ROLE */}
      <div id="role" className="mx-auto max-w-[900px] scroll-mt-6 px-5 pt-5 sm:px-10">
        <div
          style={{ boxShadow: "0 4px 14px rgba(16,24,40,0.05), 0 1px 3px rgba(16,24,40,0.04)" }}
          className="rounded-[20px] border border-[#E7EBE8] bg-white p-8 sm:p-[34px]"
        >
          <div className="mb-5 flex items-center gap-3">
            <span
              style={{
                background: "linear-gradient(150deg,#E7F6EE,#CDEBD9)",
                boxShadow: "0 6px 14px rgba(0,161,80,0.16)",
              }}
              className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] text-[#067A45]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M9 13h6M9 17h4" />
              </svg>
            </span>
            <h2 className={`${poppins.className} m-0 text-[24px] font-bold tracking-[-0.02em]`}>
              About the role
            </h2>
          </div>

          <div className="flex flex-col gap-[15px]">
            {about.map((line) => (
              <div key={line} className="flex items-start gap-[13px]">
                <span className="mt-px flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[7px] bg-[#E4F6EC] text-[13px] font-bold text-[#067A45]">
                  ✓
                </span>
                <p className="m-0 text-[15.5px] leading-[1.6] text-[#37424F]">{line}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-start gap-[13px] rounded-xl border border-[#E1EFE7] bg-[#F6FAF7] px-[18px] py-[15px]">
            <span className="flex-shrink-0 text-[16px]">📞</span>
            <p className="m-0 text-[14.5px] leading-[1.6] text-[#37424F]">
              We&apos;ll walk you through exactly how it works on a quick call — no experience needed.
            </p>
          </div>
        </div>
      </div>

      {/* APPLICATION FORM */}
      <div id="promo-apply" className="mx-auto max-w-[820px] scroll-mt-6 px-5 pb-[72px] pt-11 sm:px-10">
        <FieldMarketingForm />
      </div>
    </div>
  );
}
