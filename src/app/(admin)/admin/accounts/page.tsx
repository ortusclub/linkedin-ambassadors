import { redirect } from "next/navigation";

// The old live-inventory list is retired — Inventory v2 is now the single inventory view.
// Its CSV import and Sheets export moved onto v2; the per-account edit (/admin/accounts/[id])
// and add-account (/admin/accounts/new) sub-routes are unchanged and still used from v2.
export default function AdminAccountsPage() {
  redirect("/admin/inventory-v2");
}
