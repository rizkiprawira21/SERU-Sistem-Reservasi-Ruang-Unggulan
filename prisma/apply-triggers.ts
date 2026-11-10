import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TRIGGERS = [
  `DROP TRIGGER IF EXISTS "booking_no_overlap_insert";`,
  `CREATE TRIGGER "booking_no_overlap_insert"
BEFORE INSERT ON "Booking"
WHEN NEW.status IN ('MENUNGGU', 'DISETUJUI', 'PERLU_PERBAIKAN')
BEGIN
  SELECT RAISE(ABORT, 'ROOM_CONFLICT')
  WHERE EXISTS (
    SELECT 1 FROM "Booking" b
    WHERE b.roomId = NEW.roomId
      AND b.date = NEW.date
      AND b.status IN ('MENUNGGU', 'DISETUJUI', 'PERLU_PERBAIKAN')
      AND b.startMin < NEW.endMin
      AND NEW.startMin < b.endMin
  )
  OR EXISTS (
    SELECT 1 FROM "RoomBlock" rb
    WHERE rb.roomId = NEW.roomId
      AND rb.date = NEW.date
      AND rb.startMin < NEW.endMin
      AND NEW.startMin < rb.endMin
  );
END;`,
  `DROP TRIGGER IF EXISTS "booking_no_overlap_update";`,
  `CREATE TRIGGER "booking_no_overlap_update"
BEFORE UPDATE OF "roomId", "date", "startMin", "endMin", "status" ON "Booking"
WHEN NEW.status IN ('MENUNGGU', 'DISETUJUI', 'PERLU_PERBAIKAN')
BEGIN
  SELECT RAISE(ABORT, 'ROOM_CONFLICT')
  WHERE EXISTS (
    SELECT 1 FROM "Booking" b
    WHERE b.id <> NEW.id
      AND b.roomId = NEW.roomId
      AND b.date = NEW.date
      AND b.status IN ('MENUNGGU', 'DISETUJUI', 'PERLU_PERBAIKAN')
      AND b.startMin < NEW.endMin
      AND NEW.startMin < b.endMin
  )
  OR EXISTS (
    SELECT 1 FROM "RoomBlock" rb
    WHERE rb.roomId = NEW.roomId
      AND rb.date = NEW.date
      AND rb.startMin < NEW.endMin
      AND NEW.startMin < rb.endMin
  );
END;`,
];

async function main() {
  for (const statement of TRIGGERS) {
    await prisma.$executeRawUnsafe(statement);
  }
  console.log("Trigger anti-bentrok siap.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
