import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/site-nav";
import { ToastProvider } from "@/components/toast";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "SERU Sistem Reservasi Ruang Unggulan",
    template: "%s · SERU",
  },
  description:
    "SERU: lihat ruangan kosong, ajukan reservasi, dan pantau statusnya dalam satu tempat. Khusus sivitas akademika Institut Desain dan Bisnis Bali.",
  applicationName: "SERU",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SERU",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "SERU — Sistem Reservasi Ruang Unggulan",
    description:
      "Sistem reservasi ruang unggulan Institut Desain dan Bisnis Bali. Temukan ruang, ajukan jadwal, dan pantau persetujuan dalam satu alur.",
    type: "website",
    locale: "id_ID",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1418" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="id" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script src="/theme-init.js" />
      </head>
      <body className="min-h-screen pb-[76px] lg:pb-0">
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
        >
          Lompat ke konten utama
        </a>
        <ToastProvider>
          <SiteHeader user={user} />
          <main id="konten" className="pt-16">{children}</main>
          <BottomNav user={user} />
          <PwaRegister />
        </ToastProvider>
      </body>
    </html>
  );
}
