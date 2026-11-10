import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTimeWITA } from "@/lib/time";
import { MailIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Kotak email" };

const KIND_LABEL: Record<string, string> = {
  BOOKING_CREATED: "Pengajuan diterima",
  BOOKING_APPROVED: "Disetujui",
  BOOKING_REJECTED: "Ditolak",
  BOOKING_CANCELLED_BY_ADMIN: "Dibatalkan admin",
};

const KIND_TONE: Record<string, string> = {
  BOOKING_CREATED: "MENUNGGU",
  BOOKING_APPROVED: "DISETUJUI",
  BOOKING_REJECTED: "DITOLAK",
  BOOKING_CANCELLED_BY_ADMIN: "DIBATALKAN",
};

export default async function OutboxPage() {
  await requireAdmin();
  const mails = await prisma.outbox.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="page-shell py-8 sm:py-10">
      <div>
        <span className="eyebrow">Notifikasi</span>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
          Kotak email
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          Semua email yang dikirim sistem tersimpan di sini. Tanpa konfigurasi
          SMTP, email hanya ditulis ke console dan kotak ini.
        </p>
      </div>

      <div className="card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <MailIcon size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Email terbaru</p>
              <p className="text-[0.68rem] text-muted">{mails.length} pesan</p>
            </div>
          </div>
          <span className="chip !text-[0.68rem]">Mock mailer · outbox</span>
        </div>

        {mails.length === 0 ? (
          <div className="p-10 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <MailIcon size={26} />
            </span>
            <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
              Belum ada email
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Email akan muncul setelah ada pengajuan atau keputusan admin.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {mails.map((mail) => (
              <li key={mail.id}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-col gap-2 p-4 transition-colors hover:bg-surface-2/60 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
                        <MailIcon size={15} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="badge"
                            data-status={KIND_TONE[mail.kind] ?? "DIBATALKAN"}
                          >
                            {KIND_LABEL[mail.kind] ?? mail.kind}
                          </span>
                          <span className="text-[0.68rem] text-muted">
                            {formatDateTimeWITA(mail.createdAt)} WITA
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm font-semibold text-ink">
                          {mail.subject}
                        </p>
                        <p className="truncate text-xs text-muted">Kepada: {mail.to}</p>
                      </div>
                    </div>
                    <span className="shrink-0 self-end text-xs font-medium text-primary sm:self-auto">
                      Baca
                    </span>
                  </summary>
                  <div className="border-t border-line bg-surface-2/30 px-4 py-4">
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-body">
                      {mail.body}
                    </pre>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
