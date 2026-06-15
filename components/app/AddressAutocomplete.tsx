"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

type Prediction = { description: string; placeId: string };

/**
 * Address field backed by Google Places (via our /api/places proxy). As the
 * user types, it suggests real South African addresses. If Places isn't
 * configured the proxy returns nothing and this behaves like a plain input.
 */
export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Street address",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const justPicked = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Don't re-query immediately after the user picks a suggestion.
    if (justPicked.current) {
      justPicked.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 3) {
      setPredictions([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { predictions: Prediction[] };
        setPredictions(data.predictions ?? []);
        setOpen((data.predictions ?? []).length > 0);
        setActiveIdx(-1);
      } catch {
        /* network/abort - ignore */
      }
    }, 280);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(p: Prediction) {
    justPicked.current = true;
    onChange(p.description);
    setPredictions([]);
    setOpen(false);
    setActiveIdx(-1);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || predictions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, predictions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); pick(predictions[activeIdx]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => predictions.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        className={`field bg-white ${className}`}
      />
      {open && predictions.length > 0 && (
        <ul className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_18px_40px_-18px_rgba(60,33,104,.45)]">
          {predictions.map((p, i) => (
            <li key={p.placeId || `${p.description}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(p); }}
                onMouseEnter={() => setActiveIdx(i)}
                className={`flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] ${i === activeIdx ? "bg-surface-lav" : "bg-white"}`}
              >
                <MapPin size={15} strokeWidth={2.2} className="mt-0.5 flex-shrink-0 text-magenta-brand" />
                <span className="leading-snug text-[#3f3a57]">{p.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
