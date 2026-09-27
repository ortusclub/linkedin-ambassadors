type ReceiptState = { applicationReceived?: boolean; status: string; accountOnly?: boolean };
export function isApplicationReceived(row: ReceiptState): boolean {
  return !row.accountOnly && row.applicationReceived !== false && row.status !== "rejected" && row.status !== "unreachable";
}
export function receiptPatch(row: ReceiptState, received: boolean): Record<string, unknown> {
  return {
    applicationReceived: received,
    ...(received && ["rejected", "unreachable"].includes(row.status) ? { status: "onboarding" } : {}),
  };
}
