export function OnboardingPrice({ usd, php }: { usd: number; php: number }) {
  return <span>${usd.toLocaleString("en-US")} <span style={{ fontSize: "0.75em", fontWeight: 500 }}>(₱{php.toLocaleString("en-US")})</span></span>;
}
