"use client";

import { useState } from "react";
import { upsertServiceAction, toggleServiceActiveAction, deleteServiceAction } from "@/app/actions/admin";

export type ServiceCardData = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  mode: "ROOMS" | "HOURS" | "EXTRAS";
  basePriceRands: number;
  hourlyRateRands: number;
  minHours: number;
  quoteOnly: boolean;
  active: boolean;
};

export function ServiceCard({ service }: { service: ServiceCardData }) {
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description);
  const [price, setPrice] = useState(service.mode === "ROOMS" ? service.basePriceRands : service.hourlyRateRands);

  const isRooms = service.mode === "ROOMS";
  const isExtras = service.mode === "EXTRAS";
  // Quote-only and extras-only services carry no editable per-service price
  // (quotes are bespoke; the extras call-out minimum lives in Rewards settings).
  const priceless = service.quoteOnly || isExtras;
  const modeLabel = service.quoteOnly ? "Quote" : isRooms ? "Per room" : isExtras ? "Extras" : "Per hour";
  const priceCaption = isRooms ? "Base price (1 bed, 1 bath)" : "Per hour";

  const toggle = toggleServiceActiveAction.bind(null, service.id);
  const remove = deleteServiceAction.bind(null, service.id);

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{service.emoji}</span>
          <span className="rounded-full bg-surface-lav px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[.05em] text-indigo-brand">
            {modeLabel}
          </span>
        </div>
        <span className={"rounded-full px-2.5 py-0.5 text-[11px] font-bold " + (service.active ? "bg-[#e7f6ed] text-money" : "bg-[#f1eef6] text-muted")}>
          {service.active ? "Live" : "Hidden"}
        </span>
      </div>

      {/* Inline edit form */}
      <form action={upsertServiceAction} className="flex flex-col gap-2.5">
        <input type="hidden" name="id" value={service.id} />
        <input type="hidden" name="emoji" value={service.emoji} />
        <input type="hidden" name="mode" value={service.mode} />
        <input type="hidden" name="minHours" value={service.minHours} />
        <input type="hidden" name="quoteOnly" value={service.quoteOnly ? "true" : "false"} />
        <input type="hidden" name="active" value={service.active ? "true" : "false"} />

        <label className="flex flex-col gap-1">
          <span className="label">Name</span>
          <input name="name" value={name} onChange={(e) => setName(e.target.value)} required className="field py-2.5" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="label">Description</span>
          <input name="description" value={description} onChange={(e) => setDescription(e.target.value)} required className="field py-2.5" />
        </label>

        {priceless ? (
          <>
            {/* No editable price: round-trip both so the action preserves them. */}
            <input type="hidden" name="basePriceRands" value={service.basePriceRands} />
            <input type="hidden" name="hourlyRateRands" value={service.hourlyRateRands} />
            <p className="rounded-[12px] bg-surface-lav px-3 py-2 text-[12px] text-muted">
              {service.quoteOnly ? "Priced per enquiry from the quote form." : "Priced from selected extras (call-out minimum lives in Rewards & discounts)."}
            </p>
          </>
        ) : (
          <>
            {/* The non-edited price field still needs to round-trip so the action keeps it. */}
            <input type="hidden" name={isRooms ? "hourlyRateRands" : "basePriceRands"} value={isRooms ? service.hourlyRateRands : service.basePriceRands} />
            <label className="flex flex-col gap-1">
              <span className="label">{priceCaption}</span>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-muted">R</span>
                <input
                  name={isRooms ? "basePriceRands" : "hourlyRateRands"}
                  type="number"
                  min="0"
                  step="1"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  required
                  className="field py-2.5"
                />
              </div>
            </label>
          </>
        )}

        <button type="submit" className="btn-primary mt-1 w-full py-2.5 text-[14px]">Save</button>
      </form>

      <div className="flex items-center gap-2 border-t border-line pt-3">
        <form action={toggle} className="flex-1">
          <button type="submit" className="w-full rounded-xl border border-line-input bg-white py-2 text-[13px] font-semibold text-indigo-brand transition hover:bg-surface-lav">
            {service.active ? "Hide" : "Make live"}
          </button>
        </form>
        <form action={remove}>
          <button type="submit" title="Delete service" className="rounded-xl border border-line-input bg-white px-3 py-2 text-[15px] transition hover:bg-surface-pink">
            🗑
          </button>
        </form>
      </div>
    </div>
  );
}
