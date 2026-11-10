import { NextResponse } from "next/server";
import { destroySession, getCurrentUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { toErrorPayload } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (user) {
      await audit(prisma, {
        actorId: user.id,
        action: "LOGOUT",
        entity: "User",
        entityId: user.id,
        detail: `${user.email} keluar`,
      });
    }
    await destroySession();
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  } catch (error) {
    const payload = toErrorPayload(error);
    if (payload.status === 403) {
      return NextResponse.redirect(new URL("/", request.url), { status: 303 });
    }
    return NextResponse.json(payload.body, { status: payload.status });
  }
}
