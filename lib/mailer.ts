import type { Prisma, PrismaClient } from "@prisma/client";
import { APP_CONFIG } from "./config";

type Db = Prisma.TransactionClient | PrismaClient;

export type MailPayload = {
  to: string;
  subject: string;
  body: string;
  kind: string;
  bookingId?: string;
};

/**
 * Tulis email ke tabel Outbox (selalu) dan console (mock).
 * Implementasi SMTP hanya dipakai bila variabel lingkungan lengkap.
 */
export async function queueMail(db: Db, payload: MailPayload) {
  const mail = await db.outbox.create({
    data: {
      to: payload.to,
      subject: payload.subject,
      body: payload.body,
      kind: payload.kind,
      bookingId: payload.bookingId,
    },
  });
  console.log(
    `\n[MAIL MOCK] → ${payload.to}\nSubjek: ${payload.subject}\n${payload.body}\n`,
  );
  return mail;
}

let transporterPromise: Promise<
  import("nodemailer").Transporter | null
> | null = null;

async function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  if (!transporterPromise) {
    transporterPromise = import("nodemailer").then((mod) =>
      mod.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      }),
    );
  }
  return transporterPromise;
}

/** Kirim ke SMTP bila dikonfigurasi. Tidak pernah melempar error ke alur utama. */
export async function deliverExternal(mail: {
  to: string;
  subject: string;
  body: string;
}) {
  try {
    const transporter = await getTransporter();
    if (!transporter) return;
    await transporter.sendMail({
      from: process.env.MAIL_FROM ?? `SERU <no-reply@idb.ac.id>`,
      to: mail.to,
      subject: mail.subject,
      text: mail.body,
    });
  } catch (error) {
    console.warn("[seru] gagal mengirim SMTP, email tetap ada di outbox", error);
  }
}

export function escapeForEmail(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function mailFooter() {
  return `\n\n—\n${APP_CONFIG.appName} · ${APP_CONFIG.appFullName}\nInstitut Desain dan Bisnis Bali\nPesan otomatis, mohon tidak membalas email ini.`;
}
