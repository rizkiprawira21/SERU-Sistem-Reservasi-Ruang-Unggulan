"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import type { SessionUser } from "@/lib/auth";
import { DesktopNav } from "./site-nav";
import { ThemeToggle } from "./theme-toggle";
import { LogOutIcon } from "./icons";
import { TYPE_LABEL } from "@/lib/config";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function SiteHeader({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const overHero = pathname === "/" && !scrolled;

  const heroStyle = overHero
    ? ({
        "--color-ink": "#ffffff",
        "--color-body": "rgba(255,255,255,0.84)",
        "--color-muted": "rgba(255,255,255,0.64)",
        "--color-line": "rgba(255,255,255,0.18)",
        "--color-surface": "rgba(255,255,255,0.08)",
        "--color-surface-2": "rgba(255,255,255,0.15)",
      } as CSSProperties)
    : undefined;

  return (
    <header
      style={heroStyle}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        overHero
          ? "bg-[#041c24]/25 backdrop-blur-xl"
          : "bg-bg shadow-sm backdrop-blur-md"
      }`}
    >
      <div className="page-shell flex h-16 items-center gap-4">
        <Link
          href={user?.role === "ADMIN" ? "/staf" : "/"}
          className="group flex min-h-11 items-center gap-2.5"
          aria-label="SERU, beranda"
        >
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl p-1.5 ring-1 transition-transform group-hover:scale-[1.03] ${
              overHero ? "bg-white/10 ring-white/20" : "bg-primary-soft ring-line"
            }`}
          >
            <Image
              src="/logo-idb.png"
              alt=""
              width={32}
              height={32}
              className="h-full w-full object-contain"
              priority
            />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-semibold tracking-tight text-ink">
              SERU
            </span>
            <span className="hidden text-[0.62rem] font-medium uppercase tracking-[0.12em] text-muted sm:block">
              Sistem Reservasi Ruang Unggulan
            </span>
          </span>
        </Link>

        <div className="mx-2 hidden h-7 w-px bg-line lg:block" />
        <DesktopNav user={user} />

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle compact />
          {user ? (
            <>
              <Link
                href={user.role === "ADMIN" ? "/staf" : "/riwayat"}
                className="hidden min-h-11 items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-surface-2 sm:flex"
                aria-label={`Akun ${user.name}`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
                  {initials(user.name)}
                </span>
                <span className="leading-tight">
                  <span className="block max-w-[9rem] truncate text-xs font-semibold text-ink">
                    {user.name}
                  </span>
                  <span className="block text-[0.65rem] text-muted">
                    {user.role === "ADMIN" ? "Admin ruangan" : TYPE_LABEL[user.type]}
                  </span>
                </span>
              </Link>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="btn btn-ghost !min-h-11 !min-w-11 !px-0"
                  aria-label="Keluar"
                  title="Keluar"
                >
                  <LogOutIcon size={18} />
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="hidden sm:block">
                <Link href="/pinjam" className="btn btn-outline btn-sm">
                  Cek ketersediaan
                </Link>
              </div>
              <Link
                href="/masuk"
                className={`btn btn-sm ${overHero ? "btn-accent" : "btn-primary"}`}
              >
                Masuk
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
