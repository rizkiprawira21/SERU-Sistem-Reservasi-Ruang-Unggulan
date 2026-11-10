import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getAllRooms, facilitiesOf } from "@/lib/rooms";
import { allowedDayNames, roomHoursSummary } from "@/lib/rules";
import { RoomAdmin, type AdminRoom } from "./room-admin";

export const metadata: Metadata = { title: "Kelola ruangan" };

export default async function StafRuanganPage() {
  await requireAdmin();
  const rooms = await getAllRooms();
  const data: AdminRoom[] = rooms.map((room) => ({
    id: room.id,
    name: room.name,
    category: room.category,
    building: room.building,
    floor: room.floor,
    capacity: room.capacity,
    facilities: facilitiesOf(room),
    hoursSummary: roomHoursSummary(room),
    allowedDays: allowedDayNames(room),
    maxDurationMin: room.maxDurationMin,
    active: room.active,
  }));

  return (
    <div className="page-shell py-8 sm:py-10">
      <RoomAdmin rooms={data} />
    </div>
  );
}
