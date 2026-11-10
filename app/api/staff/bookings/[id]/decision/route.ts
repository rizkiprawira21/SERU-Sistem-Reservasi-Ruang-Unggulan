import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { decideBooking } from "@/lib/bookings";
import { toErrorPayload } from "@/lib/errors";

export async function PATCH(
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
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      note?: string;
    };
    const action = body.action === "TOLAK" ? "TOLAK" : body.action === "SETUJUI" ? "SETUJUI" : null;
    if (!action) {
      return NextResponse.json(
        { error: "INVALID_ACTION", message: "Aksi keputusan tidak dikenal." },
        { status: 422 },
      );
    }
    await decideBooking(id, user, action, body.note);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const payload = toErrorPayload(error);
    return NextResponse.json(payload.body, { status: payload.status });
  }
}
