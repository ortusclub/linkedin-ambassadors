import { prisma } from "@/lib/prisma";
import { compare, hash } from "bcryptjs";
import { cookies, headers } from "next/headers";
import { v4 as uuid } from "uuid";
import type { User } from "@/generated/prisma/client";

const SESSION_COOKIE = "session_token";
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
const ADMIN_SESSION_MAX_AGE = 8 * 60 * 60 * 1000; // 8 hours

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(password, hashedPassword);
}

export async function createSession(userId: string, isAdmin: boolean = false) {
  const token = uuid();
  const maxAge = isAdmin ? ADMIN_SESSION_MAX_AGE : SESSION_MAX_AGE;
  const expiresAt = new Date(Date.now() + maxAge);

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function getSession(): Promise<(User & { sessionId: string }) | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  return { ...session.user, sessionId: session.id };
}

export async function requireAuth(): Promise<User> {
  // Try cookie-based session first
  const user = await getSession();
  if (user) return user;

  // Fall back to Bearer token (from Electron app)
  try {
    const headerList = await headers();
    const authHeader = headerList.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
      });
      if (session && session.expiresAt > new Date()) {
        return session.user;
      }
    }
  } catch {}

  throw new Error("Unauthorized");
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
    cookieStore.delete(SESSION_COOKIE);
  }
}
