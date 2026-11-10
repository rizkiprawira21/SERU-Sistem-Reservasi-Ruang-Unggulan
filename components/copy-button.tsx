"use client";

import { useState } from "react";
import { useToast } from "./toast";
import { CheckIcon } from "./icons";

export function CopyButton({
  value,
  label = "Salin",
}: {
  value: string;
  label?: string;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-outline btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast("Disalin ke papan klip.", "success");
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          toast("Tidak dapat menyalin otomatis.", "info");
        }
      }}
      aria-label={`${label} ${value}`}
    >
      {copied ? <CheckIcon size={14} /> : null}
      {copied ? "Tersalin" : label}
    </button>
  );
}
