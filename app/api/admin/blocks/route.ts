import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { AppError, toErrorPayload } from "@/lib/errors";
import { isValidDateISO, todayISO, toMinutes } from "@/lib/time";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Akses khusus admin." },
        { status: user ? 403 : 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      roomId?: string;
      date?: string;
      start?: string;
      end?: string;
      reason?: string;
    };

    const roomId = String(body.roomId ?? "");
    const date = String(body.date ?? "");
    const startMin = toMinutes(String(body.start ?? ""));
    const endMin = toMinutes(String(body.end ?? ""));
    const reason = String(body.reason ?? "").trim();

    if (!isValidDateISO(date)) {
      throw new AppError("INVALID_DATE", "Tanggal blokir tidak valid.", 422);
    }
    if (date < todayISO()) {
      throw new AppError("DATE_PAST", "Tidak dapat memblokir tanggal yang sudah lewat.", 422);
    }
    if (!Number.isFinite(startMin) || !Number.isFinite(endMin) || endMin <= startMin) {
      throw new AppError(
        "INVALID_RANGE",
        "Jam selesai harus lebih akhir daripada jam mulai.",
        422,
      );
    }
    if (reason.length < 5) {
      throw new AppError("REASON_REQUIRED", "Alasan blokir minimal 5 karakter.", 422);
    }
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new AppError("NOT_FOUND", "Ruangan tidak ditemukan.", 404);

    const block = await prisma.roomBlock.create({
      data: { roomId, date, startMin, endMin, reason, createdById: user.id },
    });

    await audit(prisma, {
      actorId: user.id,
      action: "ROOM_BLOCKED",
      entity: "RoomBlock",
      entityId: block.id,
      detail: `${room.name} · ${date} · ${startMin}-${endMin} · ${reason}`,
    });

    return NextResponse.json({ ok: true, id: block.id }, { status: 201 });
  } catch (error) {
    const payload = toErrorPayload(error);
    return NextResponse.json(payload.body, { status: payload.status });
  }
}
