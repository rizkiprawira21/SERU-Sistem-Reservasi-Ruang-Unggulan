import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { AppError, toErrorPayload } from "@/lib/errors";
import { getAvailability, getSuggestions } from "@/lib/rooms";
import { toMinutes, isValidDateISO } from "@/lib/time";
import { validateWindow } from "@/lib/rules";
import { APP_CONFIG } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Silakan masuk terlebih dahulu." },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? "";
    const startRaw = url.searchParams.get("start");
    const endRaw = url.searchParams.get("end");

    if (!isValidDateISO(date)) {
      throw new AppError("INVALID_DATE", "Pilih tanggal terlebih dahulu.", 422);
    }
    const windowIssue = validateWindow(date);
    if (windowIssue) {
      throw new AppError(windowIssue.code, windowIssue.message, 422, {
        field: windowIssue.field,
      });
    }

    const startMin = startRaw ? toMinutes(startRaw) : NaN;
    const endMin = endRaw ? toMinutes(endRaw) : NaN;
    if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) {
      throw new AppError("INVALID_TIME", "Jam mulai dan selesai wajib diisi.", 422);
    }
    if (endMin <= startMin) {
      throw new AppError(
        "INVALID_RANGE",
        "Jam selesai harus lebih akhir daripada jam mulai.",
        422,
        { field: "end" },
      );
    }
    if (endMin - startMin < APP_CONFIG.minDurationMin) {
      throw new AppError(
        "TOO_SHORT",
        `Durasi minimum ${APP_CONFIG.minDurationMin / 60} jam.`,
        422,
        { field: "end" },
      );
    }

    const [rooms, suggestions] = await Promise.all([
      getAvailability(date, startMin, endMin),
      getSuggestions(date, startMin, endMin),
    ]);

    return NextResponse.json(
      {
        date,
        startMin,
        endMin,
        rooms,
        availableCount: rooms.filter((room) => room.status === "AVAILABLE").length,
        suggestions,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const payload = toErrorPayload(error);
    return NextResponse.json(payload.body, { status: payload.status });
  }
}
