import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SERU — Sistem Reservasi Ruang Unggulan",
    short_name: "SERU",
    description:
      "Sistem reservasi dan pengelolaan ruangan Institut Desain dan Bisnis Bali.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5f1",
    theme_color: "#007090",
    lang: "id",
    dir: "ltr",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Pinjam ruangan", url: "/pinjam" },
      { name: "Riwayat pengajuan", url: "/riwayat" },
      { name: "Antrean admin", url: "/staf" },
    ],
  };
}
