"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertIcon, CheckIcon, InfoIcon, XIcon } from "./icons";

type ToastKind = "success" | "error" | "info";
type ToastItem = {
  id: number;
  title?: string;
  message: string;
  kind: ToastKind;
};

type ToastContextValue = {
  toast: (message: string, kind?: ToastKind, title?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast harus dipakai di dalam ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "info", title?: string) => {
      counter.current += 1;
      const id = counter.current;
      setItems((current) => [...current.slice(-2), { id, message, kind, title }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6"
      >
        {items.map((item) => (
          <div key={item.id} className="toast">
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                item.kind === "success"
                  ? "bg-success-soft text-success"
                  : item.kind === "error"
                    ? "bg-danger-soft text-danger"
                    : "bg-info-soft text-info"
              }`}
            >
              {item.kind === "success" ? (
                <CheckIcon size={14} />
              ) : item.kind === "error" ? (
                <AlertIcon size={14} />
              ) : (
                <InfoIcon size={14} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              {item.title ? (
                <p className="text-sm font-semibold text-ink">{item.title}</p>
              ) : null}
              <p className="text-sm leading-snug text-body">{item.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Tutup notifikasi"
              className="rounded-full p-1 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <XIcon size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
