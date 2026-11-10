import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { createBooking } from "@/lib/bookings";
import { toErrorPayload, AppError } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Silakan masuk terlebih dahulu." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const booking = await createBooking(
      {
        roomId: String(body.roomId ?? ""),
        date: String(body.date ?? ""),
        startMin: Number(body.startMin),
        endMin: Number(body.endMin),
        activity: String(body.activity ?? ""),
        purpose: String(body.purpose ?? ""),
        participants: Number(body.participants),
      },
      user,
    );

    if (!booking) throw new AppError("INTERNAL_ERROR", "Gagal menyimpan.", 500);

    return NextResponse.json(
      {
        ok: true,
        booking: {
          id: booking.id,
          ref: booking.ref,
          status: booking.status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const payload = toErrorPayload(error);
    return NextResponse.json(payload.body, { status: payload.status });
  }
}
