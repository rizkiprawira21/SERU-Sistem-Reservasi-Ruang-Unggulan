import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { cancelBooking } from "@/lib/bookings";
import { toErrorPayload } from "@/lib/errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Akses khusus admin." },
        { status: user ? 403 : 401 },
      );
    }
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    await cancelBooking(id, user, body.reason);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const payload = toErrorPayload(error);
    return NextResponse.json(payload.body, { status: payload.status });
  }
}
