// Infer how a transaction was funded (there's no stored "method" field) from its
// type, description and tx hash. Used by the Transactions admin tab + CSV export.
export function txMethod(t: { type: string; description: string | null; txHash: string | null }): string {
  const d = (t.description || "").toLowerCase();
  if (t.txHash) return "USDC";
  if (d.includes("stripe") || d.includes("invoice")) return t.type === "deposit" ? "Stripe top-up" : "Stripe card (direct)";
  if (t.type === "deposit") return "Deposit";
  if (t.type === "rental_payment") return "Wallet credit";
  return "";
}
