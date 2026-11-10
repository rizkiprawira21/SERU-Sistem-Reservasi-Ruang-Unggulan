-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PEMOHON',
    "type" TEXT NOT NULL DEFAULT 'MAHASISWA',
    "identity" TEXT,
    "org" TEXT,
    "whatsapp" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "facilities" TEXT NOT NULL DEFAULT '[]',
    "hoursJson" TEXT NOT NULL,
    "maxDurationMin" INTEGER NOT NULL DEFAULT 240,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RoomBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomBlock_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomBlock_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ref" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,
    "activity" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "participants" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'MENUNGGU',
    "staffNote" TEXT,
    "rejectionReason" TEXT,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "decidedById" TEXT,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatusHistory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StatusHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Outbox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "bookingId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_slug_key" ON "Room"("slug");

-- CreateIndex
CREATE INDEX "RoomBlock_roomId_date_idx" ON "RoomBlock"("roomId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_ref_key" ON "Booking"("ref");

-- CreateIndex
CREATE INDEX "Booking_roomId_date_idx" ON "Booking"("roomId", "date");

-- CreateIndex
CREATE INDEX "Booking_userId_createdAt_idx" ON "Booking"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_status_date_idx" ON "Booking"("status", "date");

-- CreateIndex
CREATE INDEX "StatusHistory_bookingId_idx" ON "StatusHistory"("bookingId");

-- CreateIndex
CREATE INDEX "Outbox_createdAt_idx" ON "Outbox"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- ============================================================
-- Anti double-booking guards (atomic, enforced by SQLite)
-- A booking that holds a slot may never overlap another holding
-- booking on the same room/date, nor a room block.
-- ============================================================

CREATE TRIGGER "booking_no_overlap_insert"
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
END;

CREATE TRIGGER "booking_no_overlap_update"
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
END;
