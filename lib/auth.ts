import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { APP_CONFIG } from "./config";

export const SESSION_COOKIE = "seru_session";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "PEMOHON" | "ADMIN";
  type: "MAHASISWA" | "DOSEN" | "STAF";
  identity: string | null;
  org: string | null;
  whatsapp: string | null;
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + APP_CONFIG.sessionDays * 24 * 60 * 60 * 1000,
  );
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  const u = session.user;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    type: u.type,
    identity: u.identity,
    org: u.org,
    whatsapp: u.whatsapp,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk?next=/staf");
  if (user.role !== "ADMIN") redirect("/pinjam");
  return user;
}

export async function requireApplicant(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk?next=/pinjam");
  if (user.role !== "PEMOHON") redirect("/staf");
  return user;
}

export async function authenticate(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (!user) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    type: user.type,
    identity: user.identity,
    org: user.org,
    whatsapp: user.whatsapp,
  };
}
