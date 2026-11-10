"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarIcon,
  DoorIcon,
  HomeIcon,
  InboxIcon,
  MailIcon,
  PlusIcon,
  HistoryIcon,
} from "./icons";
import type { SessionUser } from "@/lib/auth";

const ICONS = {
  home: HomeIcon,
  plus: PlusIcon,
  history: HistoryIcon,
  inbox: InboxIcon,
  door: DoorIcon,
  calendar: CalendarIcon,
  mail: MailIcon,
};

type Item = {
  href: string;
  label: string;
  short: string;
  icon: keyof typeof ICONS;
  match?: "exact" | "prefix";
};

const GUEST: Item[] = [
  { href: "/", label: "Beranda", short: "Beranda", icon: "home", match: "exact" },
  { href: "/#ruangan", label: "Katalog ruangan", short: "Ruangan", icon: "door" },
  { href: "/masuk", label: "Masuk", short: "Masuk", icon: "plus" },
];

const APPLICANT: Item[] = [
  { href: "/", label: "Beranda", short: "Beranda", icon: "home", match: "exact" },
  { href: "/pinjam", label: "Reservasi ruangan", short: "Reservasi", icon: "plus" },
  { href: "/riwayat", label: "Riwayat", short: "Riwayat", icon: "history", match: "prefix" },
];

const ADMIN: Item[] = [
  { href: "/staf", label: "Antrean", short: "Antrean", icon: "inbox", match: "exact" },
  { href: "/staf/ruangan", label: "Ruangan", short: "Ruangan", icon: "door", match: "prefix" },
  { href: "/staf/jadwal", label: "Jadwal", short: "Jadwal", icon: "calendar", match: "prefix" },
  { href: "/staf/outbox", label: "Email", short: "Email", icon: "mail", match: "prefix" },
];

function itemsFor(user: SessionUser | null): Item[] {
  if (!user) return GUEST;
  if (user.role === "ADMIN") return ADMIN;
  return APPLICANT;
}

function isActive(pathname: string, item: Item): boolean {
  if (item.match === "exact") return pathname === item.href;
  if (item.match === "prefix") return pathname === item.href || pathname.startsWith(`${item.href}/`);
  return false;
}

export function DesktopNav({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi utama" className="hidden items-center gap-1 lg:flex">
      {itemsFor(user).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="nav-link"
          data-active={isActive(pathname, item)}
          aria-current={isActive(pathname, item) ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const items = itemsFor(user);
  return (
    <nav
      aria-label="Navigasi bawah"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
    >
      <div className="pb-safe mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-[56px] min-w-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[0.68rem] font-medium transition-colors ${
                active ? "text-primary" : "text-muted hover:text-ink"
              }`}
            >
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                  active ? "bg-primary-soft" : ""
                }`}
              >
                <Icon size={20} />
              </span>
              <span>{item.short}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
