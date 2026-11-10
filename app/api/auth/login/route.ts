import { NextResponse } from "next/server";
import { authenticate, createSession } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { APP_CONFIG } from "@/lib/config";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { toErrorPayload } from "@/lib/errors";

function safeNext(next: unknown, role: "PEMOHON" | "ADMIN"): string {
  const fallback = role === "ADMIN" ? "/staf" : "/pinjam";
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (role === "ADMIN") {
    return next.startsWith("/staf") ? next : "/staf";
  }
  return next.startsWith("/pinjam") || next.startsWith("/riwayat") ? next : "/pinjam";
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      next?: string;
    };
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        {
          error: "MISSING_CREDENTIALS",
          message: "Email dan kata sandi wajib diisi.",
        },
        { status: 422 },
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const limit = rateLimit(
      `login:${ip}:${email}`,
      APP_CONFIG.loginMaxAttempts,
      APP_CONFIG.loginWindowMs,
    );
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: "TOO_MANY_ATTEMPTS",
          message: `Terlalu banyak percobaan masuk. Coba lagi dalam ${Math.ceil(
            limit.retryAfterSec / 60,
          )} menit.`,
        },
        { status: 429 },
      );
    }

    const user = await authenticate(email, password);
    if (!user) {
      return NextResponse.json(
        {
          error: "INVALID_CREDENTIALS",
          message: "Email atau kata sandi tidak cocok. Periksa kembali.",
        },
        { status: 401 },
      );
    }

    await createSession(user.id);
    await audit(prisma, {
      actorId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      detail: `${user.email} masuk sebagai ${user.role}`,
    });

    return NextResponse.json({
      ok: true,
      redirect: safeNext(body.next, user.role),
      user: { name: user.name, role: user.role },
    });
  } catch (error) {
    const payload = toErrorPayload(error);
    return NextResponse.json(payload.body, { status: payload.status });
  }
}
