// Shared derivations for the renter tracker (admin UI + CSV export), so both
// always show the same labels.

type ShareRef = { email?: string; shareId?: string };

export interface TrackerRental {
  status: string;
  usdcPayment?: boolean;
  paused?: boolean;
  accessGrantedAt?: string | Date | null;
  accessRevokedAt?: string | Date | null;
  gologinShareIds?: unknown;
}

export function paymentMethod(r: TrackerRental): "USDC" | "Stripe" {
  return r.usdcPayment ? "USDC" : "Stripe";
}

// Money state: did they pay, are we waiting, or is it overdue/ended?
export function paymentStatus(r: TrackerRental): "Paid" | "Pending" | "Overdue" | "Expired" | "Cancelled" {
  switch (r.status) {
    case "active":
      return "Paid";
    case "pending_access":
      return "Pending";
    case "payment_failed":
      return "Overdue";
    case "expired":
      return "Expired";
    case "cancelled":
      return "Cancelled";
    default:
      return "Pending";
  }
}

// GoLogin access state, independent of payment.
export function accessStatus(r: TrackerRental): "Granted" | "Paused" | "Revoked" | "Not granted" {
  if (r.paused) return "Paused";
  const shares = Array.isArray(r.gologinShareIds) ? (r.gologinShareIds as ShareRef[]) : [];
  if (shares.length > 0) return "Granted";
  if (r.accessRevokedAt) return "Revoked";
  return "Not granted";
}
