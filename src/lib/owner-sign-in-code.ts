import { readAccountCodeLink } from "@/lib/account-code-link";
import { prisma } from "@/lib/prisma";
import { verifiedRecoveryOwner } from "@/lib/primary-email-recovery";
import { decryptSecret } from "@/lib/crypto-creds";
import { generateTotp } from "@/lib/totp";
import { EmailSetupError } from "@/lib/onboarding-email-policy";

export async function ownerSignInCode(token: string, loginEmail: string) {
  const id = await verifiedRecoveryOwner(token);
  return codeForAccount(id, loginEmail);
}
export async function privateOwnerSignInCode(token: string, loginEmail: string) {
  return codeForAccount(await readAccountCodeLink(token), loginEmail);
}
async function codeForAccount(id: string, loginEmail: string) {
  const account = await prisma.linkedInAccount.findUnique({ where: { id }, select: { twoFactor: true, loginEmail: true, removedAt: true, status: true, restrictedAt: true, twoFactorResetNeeded: true, rentals: { where: { status: { in: ["active", "pending_access", "payment_failed"] }, isShadow: false }, select: { id: true }, take: 1 } } });
  if (!account || account.removedAt) throw new EmailSetupError("Please contact our team to check your account.", 403);
  // Match the inventory's maintenance override without changing rental/billing state.
  // Shadow assignments do not occupy inventory; actual customer rentals still block access.
  const maintenanceOverride = account.status === "available" && (!!account.restrictedAt || account.twoFactorResetNeeded);
  const eligibleStatus = ["under_review", "maintenance", "under_construction", "construction_immature", "unavailable"].includes(account.status) || maintenanceOverride;
  if (!eligibleStatus || account.rentals.length > 0) {
    throw new EmailSetupError("Sign-in codes are unavailable while this account is available, rented, on trial, or no longer in service. Please contact our team.", 403);
  }
  if (!loginEmail.trim() || account.loginEmail?.trim().toLowerCase() !== loginEmail.trim().toLowerCase()) {
    throw new EmailSetupError("That login email does not match the account linked to this access session. Check the address or contact our team.", 403);
  }
  const secret = (decryptSecret(account.twoFactor) || "").replace(/\s/g, "");
  if (!/^[A-Z2-7]{16,}={0,6}$/i.test(secret)) throw new EmailSetupError("We cannot generate a code for this account. Use your authenticator or book a call with our team.", 409);
  const { code, expiresIn } = generateTotp(secret);
  return { code, expiresAt: Date.now() + expiresIn * 1000, address: account.loginEmail };
}
