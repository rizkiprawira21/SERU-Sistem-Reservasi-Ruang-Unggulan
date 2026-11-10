"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertIcon, CheckIcon, XIcon } from "@/components/icons";

const DEMOS = [
  { role: "Mahasiswa", email: "mahasiswa@idb.ac.id", password: "Mahasiswa123!" },
  { role: "Admin", email: "admin@idb.ac.id", password: "Admin123!" },
];

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        redirect?: string;
      };
      if (!response.ok) {
        setError(data.message ?? "Tidak dapat masuk. Coba lagi.");
        return;
      }
      router.replace(data.redirect ?? "/pinjam");
      router.refresh();
    } catch {
      setError("Koneksi bermasalah. Periksa jaringan lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger-soft px-3 py-2.5 text-sm text-danger"
          >
            <AlertIcon size={17} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="field">
          <label className="label" htmlFor="email">
            Email kampus
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            required
            className="input"
            placeholder="nama@idb.ac.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="password">
            Kata sandi
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              required
              className="input pr-20"
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute inset-y-0 right-1 flex min-w-11 items-center justify-center rounded-lg px-2 text-xs font-medium text-muted hover:text-ink"
              aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              {show ? "Sembunyi" : "Lihat"}
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? (
            <>
              <span
                aria-hidden
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              />
              Memeriksa akun…
            </>
          ) : (
            "Masuk"
          )}
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-line bg-surface-2/60 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Akun demo
          </p>
          <span className="flex items-center gap-1 text-[0.68rem] text-muted">
            <CheckIcon size={12} /> Klik untuk isi
          </span>
        </div>
        <div className="mt-3 grid gap-2">
          {DEMOS.map((demo) => (
            <button
              key={demo.email}
              type="button"
              onClick={() => {
                setEmail(demo.email);
                setPassword(demo.password);
                setError(null);
              }}
              className="group flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2 text-left transition-colors hover:border-primary/50 hover:bg-primary-soft/40"
            >
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-ink">{demo.role}</span>
                <span className="block truncate text-xs text-muted">{demo.email}</span>
              </span>
              <code className="shrink-0 rounded-md bg-surface-2 px-2 py-1 text-[0.66rem] text-body">
                {demo.password}
              </code>
            </button>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-[0.68rem] leading-relaxed text-muted">
          <XIcon size={12} className="mt-0.5 shrink-0" />
          Ganti ke SSO kampus cukup dengan mengganti lapisan autentikasi di
          server; sesi tetap aman berbasis cookie httpOnly.
        </p>
      </div>
    </div>
  );
}
