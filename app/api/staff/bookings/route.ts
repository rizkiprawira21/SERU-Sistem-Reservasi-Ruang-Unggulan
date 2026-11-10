import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { toErrorPayload } from "@/lib/errors";
import { getStaffBookings, getStaffStats, getTodayBookings } from "@/lib/staff";
import { todayISO } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Akses khusus admin." },
        { status: user ? 403 : 401 },
      );
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "MENUNGGU";
    const date = url.searchParams.get("date") ?? undefined;
    const q = url.searchParams.get("q") ?? undefined;

    const [bookings, stats, todayBookings] = await Promise.all([
      getStaffBookings({ status, date, q }),
      getStaffStats(),
      getTodayBookings(),
    ]);

    return NextResponse.json(
      {
        bookings,
        stats,
        todayBookings,
        today: todayISO(),
        fetchedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const payload = toErrorPayload(error);
    return NextResponse.json(payload.body, { status: payload.status });
  }
}
