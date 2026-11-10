import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TRIGGERS = [
  `CREATE OR REPLACE FUNCTION seru_booking_no_overlap() RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('MENUNGGU', 'DISETUJUI') THEN
    IF EXISTS (
      SELECT 1 FROM "Booking" b
      WHERE b."roomId" = NEW."roomId"
        AND b."date" = NEW."date"
        AND b."status" IN ('MENUNGGU', 'DISETUJUI')
        AND b."startMin" < NEW."endMin"
        AND NEW."startMin" < b."endMin"
        AND b."id" <> NEW."id"
    ) OR EXISTS (
      SELECT 1 FROM "RoomBlock" rb
      WHERE rb."roomId" = NEW."roomId"
        AND rb."date" = NEW."date"
        AND rb."startMin" < NEW."endMin"
        AND NEW."startMin" < rb."endMin"
    ) THEN
      RAISE EXCEPTION 'ROOM_CONFLICT';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`,
  `DROP TRIGGER IF EXISTS "booking_no_overlap_insert" ON "Booking";`,
  `CREATE TRIGGER "booking_no_overlap_insert"
BEFORE INSERT ON "Booking"
FOR EACH ROW EXECUTE FUNCTION seru_booking_no_overlap();`,
  `DROP TRIGGER IF EXISTS "booking_no_overlap_update" ON "Booking";`,
  `CREATE TRIGGER "booking_no_overlap_update"
BEFORE UPDATE OF "roomId", "date", "startMin", "endMin", "status" ON "Booking"
FOR EACH ROW EXECUTE FUNCTION seru_booking_no_overlap();`,
];

async function main() {
  for (const statement of TRIGGERS) {
    await prisma.$executeRawUnsafe(statement);
  }
  console.log("Trigger anti-bentrok PostgreSQL siap.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
