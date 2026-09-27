import { CURRENCY_CONFIG, type Currency } from "./referral-currency";
import { PHP_PER_USD } from "./utils";
const money = (amount: number, currency: Currency) => CURRENCY_CONFIG[currency].symbol + amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
// Published programme prices are agreed anchors, not a live exchange rate.
export const offerPair = (usd: number, php: number, preferred: Currency) => preferred === "USD" ? `${money(usd, "USD")} (${money(php, "PHP")})` : `${money(php, "PHP")} (${money(usd, "USD")})`;
export const offerRange = (usdLo: number, usdHi: number, phpLo: number, phpHi: number, preferred: Currency) => preferred === "USD"
  ? `${money(usdLo, "USD")}–${money(usdHi, "USD")} (${money(phpLo, "PHP")}–${money(phpHi, "PHP")})`
  : `${money(phpLo, "PHP")}–${money(phpHi, "PHP")} (${money(usdLo, "USD")}–${money(usdHi, "USD")})`;
// Actual balances/receipts retain their saved denomination. Other-currency values are estimates.
export function balancePair(amount: number, actual: Currency, preferred: Currency) {
  const other: Currency = actual === "USD" ? "PHP" : "USD";
  const converted = actual === "USD" ? amount * PHP_PER_USD : amount / PHP_PER_USD;
  const exact = money(amount, actual), estimate = `${amount ? "≈" : ""}${money(converted, other)}`;
  return preferred === actual ? `${exact} (${estimate})` : `${estimate} (${exact})`;
}
export function balanceText(text: string, preferred: Currency) {
  return text.replace(/([₱$])([\d,]+(?:\.\d+)?)/g, (_all, symbol, amount) => balancePair(Number(amount.replaceAll(",", "")), symbol === "$" ? "USD" : "PHP", preferred));
}
export function configuredOffer(amount: number, actual: Currency, preferred: Currency) {
  const source = CURRENCY_CONFIG[actual], other = CURRENCY_CONFIG[actual === "USD" ? "PHP" : "USD"];
  const pairs = [[source.referralTiers.referral, other.referralTiers.referral], [source.referralTiers.phone.base, other.referralTiers.phone.base], [source.referralTiers.phone.verified, other.referralTiers.phone.verified], [source.referralTiers.computer.base, other.referralTiers.computer.base], [source.setupAmount, other.setupAmount], [source.monthlyAmount, other.monthlyAmount]];
  const match = pairs.find(([n]) => n === amount);
  if (!match) return balancePair(amount, actual, preferred);
  return actual === "USD" ? offerPair(amount, match[1], preferred) : offerPair(match[1], amount, preferred);
}
