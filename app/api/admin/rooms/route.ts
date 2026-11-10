import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { AppError, toErrorPayload } from "@/lib/errors";
import { APP_CONFIG } from "@/lib/config";
import { toMinutes } from "@/lib/time";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

function buildHours(days: number[], open: number, close: number) {
  const map: Record<string, { open: number; close: number } | null> = {};
  for (let day = 0; day <= 6; day += 1) {
    map[String(day)] = days.includes(day) ? { open, close } : null;
  }
  return JSON.stringify(map);
}

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
      name?: string;
      category?: string;
      building?: string;
      floor?: string;
      capacity?: number;
      description?: string;
      facilities?: string[] | string;
      days?: number[];
      open?: string;
      close?: string;
      maxHours?: number;
    };

    const name = String(body.name ?? "").trim();
    if (name.length < 3) {
      throw new AppError("INVALID_NAME", "Nama ruangan minimal 3 karakter.", 422);
    }
    const capacity = Number(body.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 2000) {
      throw new AppError("INVALID_CAPACITY", "Kapasitas harus 1–2000 orang.", 422);
    }
    const maxHours = Number(body.maxHours ?? 4);
    if (!Number.isFinite(maxHours) || maxHours < 1 || maxHours > 12) {
      throw new AppError("INVALID_DURATION", "Durasi maksimum 1–12 jam.", 422);
    }
    const open = body.open ? toMinutes(body.open) : APP_CONFIG.dayOpenMin;
    const close = body.close ? toMinutes(body.close) : APP_CONFIG.dayCloseMin;
    if (!Number.isFinite(open) || !Number.isFinite(close) || close <= open) {
      throw new AppError("INVALID_HOURS", "Jam operasional tidak valid.", 422);
    }
    const days = Array.isArray(body.days)
      ? body.days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      : [1, 2, 3, 4, 5];
    if (days.length === 0) {
      throw new AppError("INVALID_DAYS", "Pilih minimal satu hari.", 422);
    }

    const facilities = Array.isArray(body.facilities)
      ? body.facilities.filter((item) => typeof item === "string" && item.trim())
      : String(body.facilities ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

    const room = await prisma.room.create({
      data: {
        slug: `${slugify(name) || "ruang"}-${randomInt(1000, 9999)}`,
        name,
        category: String(body.category ?? "Ruang kelas").trim() || "Ruang kelas",
        description:
          String(body.description ?? "").trim() ||
          `Ruang ${name} untuk kegiatan sivitas akademika IDB Bali.`,
        building: String(body.building ?? "Gedung A").trim() || "Gedung A",
        floor: String(body.floor ?? "Lantai 1").trim() || "Lantai 1",
        capacity,
        facilities: JSON.stringify(facilities),
        hoursJson: buildHours(days, open, close),
        maxDurationMin: Math.round(maxHours * 60),
        active: true,
      },
    });

    await audit(prisma, {
      actorId: user.id,
      action: "ROOM_CREATED",
      entity: "Room",
      entityId: room.id,
      detail: `${room.name} · ${room.building} ${room.floor}`,
    });

    return NextResponse.json({ ok: true, room: { id: room.id, name: room.name } }, { status: 201 });
  } catch (error) {
    const payload = toErrorPayload(error);
    return NextResponse.json(payload.body, { status: payload.status });
  }
}
