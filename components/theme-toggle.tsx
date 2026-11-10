"use client";

import { useEffect, useState } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

type Mode = "light" | "dark" | "system";

function applyTheme(mode: Mode) {
  const resolved =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  document.documentElement.setAttribute("data-theme", resolved);
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<Mode>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("seru-theme");
    setMode(
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system",
    );
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (mode === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode, mounted]);

  function choose(next: Mode) {
    setMode(next);
    localStorage.setItem("seru-theme", next);
    applyTheme(next);
  }

  const options: { value: Mode; label: string; Icon: typeof SunIcon }[] = [
    { value: "light", label: "Terang", Icon: SunIcon },
    { value: "dark", label: "Gelap", Icon: MoonIcon },
    { value: "system", label: "Ikuti sistem", Icon: MonitorIcon },
  ];

  if (compact) {
    const next = mode === "dark" ? "light" : "dark";
    return (
      <button
        type="button"
        className="btn btn-ghost !min-h-11 !min-w-11 !px-0"
        onClick={() => choose(next)}
        aria-label={`Ganti mode ${next === "dark" ? "gelap" : "terang"}`}
        title="Ganti mode terang/gelap"
      >
        {mounted && mode === "dark" ? <SunIcon size={19} /> : <MoonIcon size={19} />}
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Mode tampilan"
      className="inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-1"
    >
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => choose(value)}
          aria-label={label}
          aria-pressed={mounted && mode === value}
          title={label}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
            mounted && mode === value
              ? "bg-primary-soft text-primary"
              : "text-muted hover:text-ink"
          }`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
