import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { AppError, toErrorPayload } from "@/lib/errors";

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
    const existing = await prisma.room.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Ruangan tidak ditemukan.", 404);
    }

    const body = (await request.json().catch(() => ({}))) as {
      active?: boolean;
      capacity?: number;
      maxHours?: number;
      description?: string;
      facilities?: string[] | string;
    };

    const data: {
      active?: boolean;
      capacity?: number;
      maxDurationMin?: number;
      description?: string;
      facilities?: string;
    } = {};

    if (typeof body.active === "boolean") data.active = body.active;
    if (body.capacity !== undefined) {
      const capacity = Number(body.capacity);
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 2000) {
        throw new AppError("INVALID_CAPACITY", "Kapasitas harus 1–2000 orang.", 422);
      }
      data.capacity = capacity;
    }
    if (body.maxHours !== undefined) {
      const maxHours = Number(body.maxHours);
      if (!Number.isFinite(maxHours) || maxHours < 1 || maxHours > 12) {
        throw new AppError("INVALID_DURATION", "Durasi maksimum 1–12 jam.", 422);
      }
      data.maxDurationMin = Math.round(maxHours * 60);
    }
    if (body.description !== undefined) {
      data.description = String(body.description).trim().slice(0, 500);
    }
    if (body.facilities !== undefined) {
      const facilities = Array.isArray(body.facilities)
        ? body.facilities.filter((item) => typeof item === "string" && item.trim())
        : String(body.facilities)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
      data.facilities = JSON.stringify(facilities);
    }

    const room = await prisma.room.update({ where: { id }, data });
    await audit(prisma, {
      actorId: user.id,
      action: "ROOM_UPDATED",
      entity: "Room",
      entityId: room.id,
      detail: JSON.stringify(data),
    });
    return NextResponse.json({ ok: true, active: room.active });
  } catch (error) {
    const payload = toErrorPayload(error);
    return NextResponse.json(payload.body, { status: payload.status });
  }
}
