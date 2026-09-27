import { prisma } from "@/lib/prisma";
import { verifiedRecoveryOwner } from "@/lib/primary-email-recovery";
import { decryptSecret } from "@/lib/crypto-creds";
import { generateTotp } from "@/lib/totp";
import { EmailSetupError } from "@/lib/onboarding-email-policy";

export async function ownerSignInCode(token: string) {
  const id = await verifiedRecoveryOwner(token);
  const account = await prisma.linkedInAccount.findUnique({ where: { id }, select: { twoFactor: true, loginEmail: true, removedAt: true } });
  if (!account || account.removedAt) throw new EmailSetupError("Please contact our team to check your account.", 403);
  const secret = (decryptSecret(account.twoFactor) || "").replace(/\s/g, "");
  if (!/^[A-Z2-7]{16,}={0,6}$/i.test(secret)) throw new EmailSetupError("We cannot generate a code for this account. Use your authenticator or book a call with our team.", 409);
  const { code, expiresIn } = generateTotp(secret);
  return { code, expiresAt: Date.now() + expiresIn * 1000, address: account.loginEmail };
}
