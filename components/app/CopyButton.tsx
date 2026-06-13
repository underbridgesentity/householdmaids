"use client";

import { useState } from "react";

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className={className ?? "rounded-[10px] bg-indigo-brand px-3.5 py-2 font-display text-[12.5px] font-bold text-white"}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
