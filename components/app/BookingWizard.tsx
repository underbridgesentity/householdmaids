"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { computePrice, type Recurrence } from "@/lib/pricing";
import { formatZar } from "@/lib/money";
import { servicePhoto } from "@/lib/service-photos";
import { createBookingAction } from "@/app/actions/booking";

type Service = { id: string; name: string; emoji: string; tint: string; description: string; mode: "ROOMS" | "HOURS"; basePrice: number; hourlyRate: number; minHours: number };
type Addon = { id: string; name: string; emoji: string; price: number };
type Area = { id: string; name: string };
type Settings = { perBedroomCents: number; perBathroomCents: number; weeklyDiscountPct: number; biweeklyDiscountPct: number; firstBookingDiscountCents: number };
type DateOption = { iso: string; label: string; sub: string };

const TIMES = ["07:00", "09:00", "11:00", "13:00", "15:00"];
const RECUR: { id: Recurrence; label: string; sub: string }[] = [
  { id: "ONCE", label: "One-time", sub: "Just this clean" },
  { id: "WEEKLY", label: "Weekly", sub: "Save 15% · most popular" },
  { id: "BIWEEKLY", label: "Every 2 weeks", sub: "Save 10%" },
];

export function BookingWizard({
  services, addons, areas, settings, dateOptions, referralEligible, referralCode, initialServiceId,
}: {
  services: Service[]; addons: Addon[]; areas: Area[]; settings: Settings; dateOptions: DateOption[];
  referralEligible: boolean; referralCode?: string; initialServiceId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(initialServiceId ? 1 : 0);
  const [serviceId, setServiceId] = useState(initialServiceId ?? services[0]?.id);
  const [beds, setBeds] = useState(2);
  const [baths, setBaths] = useState(1);
  const [hours, setHours] = useState(3);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [areaId, setAreaId] = useState(areas[0]?.id);
  const [address, setAddress] = useState("");
  const [dateIso, setDateIso] = useState(dateOptions[1]?.iso ?? dateOptions[0]?.iso);
  const [time, setTime] = useState("09:00");
  const [recurrence, setRecurrence] = useState<Recurrence>("ONCE");
  const [applyReferral, setApplyReferral] = useState(referralEligible);
  const [submitting, setSubmitting] = useState(false);

  const service = services.find((s) => s.id === serviceId)!;
  const effectiveHours = Math.max(hours, service.mode === "HOURS" ? service.minHours : 0);

  const breakdown = useMemo(
    () =>
      computePrice({
        service,
        beds, baths, hours: effectiveHours,
        addonCents: addonIds.map((id) => addons.find((a) => a.id === id)?.price ?? 0),
        recurrence,
        applyReferralDiscount: applyReferral && referralEligible,
        settings,
      }),
    [service, beds, baths, effectiveHours, addonIds, recurrence, applyReferral, referralEligible, addons, settings],
  );

  const toggleAddon = (id: string) =>
    setAddonIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  function submit() {
    setSubmitting(true);
    const fd = new FormData();
    fd.set("serviceId", serviceId);
    fd.set("areaId", areaId);
    fd.set("addressText", address || areas.find((a) => a.id === areaId)?.name || "Gauteng");
    fd.set("beds", String(beds));
    fd.set("baths", String(baths));
    fd.set("hours", String(effectiveHours));
    addonIds.forEach((id) => fd.append("addonIds", id));
    fd.set("recurrence", recurrence);
    fd.set("scheduledAt", `${dateIso}T${time}:00`);
    fd.set("applyReferral", applyReferral ? "true" : "false");
    createBookingAction(fd).catch(() => setSubmitting(false));
  }

  const back = () => (step === 0 ? router.push("/app") : setStep((s) => s - 1));
  const BackBtn = () => (
    <button onClick={back} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-lav text-lg text-indigo-brand">‹</button>
  );
  const area = areas.find((a) => a.id === areaId);
  const dateLabel = dateOptions.find((d) => d.iso === dateIso);

  return (
    <div className="flex min-h-screen flex-col md:min-h-0 md:h-full">
      {/* STEP 0 — choose service */}
      {step === 0 && (
        <div className="flex-1">
          <div className="flex items-center gap-3 px-5 pb-4 pt-2">
            <BackBtn />
            <div>
              <div className="font-display text-xl font-extrabold">Choose a service</div>
              <div className="text-[12.5px] text-muted">What can we help with today?</div>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 px-[18px] pb-7">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => { setServiceId(s.id); setHours(Math.max(3, s.minHours)); setStep(1); }}
                className={`flex items-center gap-3.5 rounded-[18px] border-[1.5px] bg-white p-3.5 text-left shadow-card ${s.id === serviceId ? "border-magenta-brand" : "border-line"}`}
              >
                <div className="relative h-[54px] w-[54px] flex-shrink-0 overflow-hidden rounded-[15px]">
                  <Image src={servicePhoto(s.name)} alt={s.name} fill sizes="54px" className="object-cover" />
                </div>
                <div className="flex-1">
                  <div className="font-display text-[15.5px] font-bold">{s.name}</div>
                  <div className="mt-0.5 text-[12.5px] text-muted">{s.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10.5px] text-muted-faint">from</div>
                  <div className="font-display text-sm font-bold text-magenta-brand">
                    {formatZar(s.mode === "ROOMS" ? s.basePrice + settings.perBedroomCents + settings.perBathroomCents : s.minHours * s.hourlyRate)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 1 — configure */}
      {step === 1 && (
        <>
          <div className="flex items-center gap-3 px-5 pb-3.5 pt-2">
            <BackBtn />
            <div>
              <div className="font-display text-xl font-extrabold">Customise your clean</div>
              <div className="text-[12.5px] text-muted">Step 1 of 4</div>
            </div>
          </div>
          <div className="flex-1 px-[18px]">
            <div className="mb-4 flex items-center gap-3 rounded-[17px] bg-gradient-to-br from-[#f3ecfa] to-[#fbeef7] p-3.5">
              <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-white text-[23px]">{service.emoji}</div>
              <div className="font-display text-base font-bold">{service.name}</div>
            </div>

            {service.mode === "ROOMS" ? (
              <>
                <Counter label="Bedrooms" sub="+R90 each" value={beds} onDec={() => setBeds((v) => Math.max(1, v - 1))} onInc={() => setBeds((v) => Math.min(8, v + 1))} />
                <Counter label="Bathrooms" sub="+R70 each" value={baths} onDec={() => setBaths((v) => Math.max(1, v - 1))} onInc={() => setBaths((v) => Math.min(6, v + 1))} />
              </>
            ) : (
              <Counter label="Hours needed" sub="Billed per hour" value={effectiveHours} onDec={() => setHours((v) => Math.max(service.minHours, v - 1))} onInc={() => setHours((v) => Math.min(10, v + 1))} />
            )}

            <div className="mb-3 mt-5 px-0.5 font-display text-[15px] font-bold">Add extras</div>
            <div className="flex flex-col gap-2.5">
              {addons.map((a) => {
                const sel = addonIds.includes(a.id);
                return (
                  <button key={a.id} onClick={() => toggleAddon(a.id)} className={`flex items-center gap-3 rounded-[15px] border-[1.5px] p-3.5 text-left ${sel ? "border-magenta-brand bg-surface-pink" : "border-line bg-white"}`}>
                    <div className="text-xl">{a.emoji}</div>
                    <div className="flex-1 font-display text-[14.5px] font-semibold">{a.name}</div>
                    <div className="text-[13px] font-semibold text-muted">+{formatZar(a.price)}</div>
                    <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-[1.5px] text-sm text-white ${sel ? "border-magenta-brand bg-magenta-brand" : "border-[#d6cee2] bg-white"}`}>✓</div>
                  </button>
                );
              })}
            </div>
            <div className="h-4" />
          </div>
          <FooterTotal total={breakdown.totalCents} onClick={() => setStep(2)} label="Continue ›" />
        </>
      )}

      {/* STEP 2 — area */}
      {step === 2 && (
        <>
          <div className="flex items-center gap-3 px-5 pb-3.5 pt-2">
            <BackBtn />
            <div>
              <div className="font-display text-xl font-extrabold">Where are you?</div>
              <div className="text-[12.5px] text-muted">Step 2 of 4 · Gauteng</div>
            </div>
          </div>
          <div className="flex-1 px-[18px]">
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" className="field mb-4 bg-white" />
            <div className="mb-3 px-0.5 font-display text-sm font-bold text-muted-label">Select your area</div>
            <div className="grid grid-cols-3 gap-2.5">
              {areas.map((a) => (
                <button key={a.id} onClick={() => setAreaId(a.id)} className={`rounded-[13px] border-[1.5px] px-2 py-2.5 text-center text-[13.5px] font-bold ${a.id === areaId ? "border-magenta-brand bg-surface-pink text-magenta-brand" : "border-line-input bg-white text-[#5f5878]"}`}>{a.name}</button>
              ))}
            </div>
          </div>
          <FooterButton onClick={() => setStep(3)} label="Continue to schedule ›" />
        </>
      )}

      {/* STEP 3 — schedule */}
      {step === 3 && (
        <>
          <div className="flex items-center gap-3 px-5 pb-3.5 pt-2">
            <BackBtn />
            <div>
              <div className="font-display text-xl font-extrabold">Pick a time</div>
              <div className="text-[12.5px] text-muted">Step 3 of 4</div>
            </div>
          </div>
          <div className="flex-1 px-[18px]">
            <div className="mb-3 px-0.5 font-display text-sm font-bold text-muted-label">Date</div>
            <div className="mb-5 grid grid-cols-5 gap-2">
              {dateOptions.map((d) => (
                <button key={d.iso} onClick={() => setDateIso(d.iso)} className={`rounded-[13px] border-[1.5px] py-2.5 text-center ${d.iso === dateIso ? "border-magenta-brand bg-surface-pink text-magenta-brand" : "border-line-input bg-white text-[#5f5878]"}`}>
                  <div className="text-sm font-extrabold">{d.label}</div>
                  <div className="text-[10.5px] opacity-70">{d.sub}</div>
                </button>
              ))}
            </div>
            <div className="mb-3 px-0.5 font-display text-sm font-bold text-muted-label">Start time</div>
            <div className="mb-5 grid grid-cols-5 gap-2">
              {TIMES.map((t) => (
                <button key={t} onClick={() => setTime(t)} className={`rounded-[13px] border-[1.5px] px-1 py-2.5 text-center text-[13px] font-bold ${t === time ? "border-magenta-brand bg-surface-pink text-magenta-brand" : "border-line-input bg-white text-[#5f5878]"}`}>{t}</button>
              ))}
            </div>
            <div className="mb-3 px-0.5 font-display text-sm font-bold text-muted-label">How often?</div>
            <div className="flex flex-col gap-2.5">
              {RECUR.map((r) => {
                const sel = r.id === recurrence;
                return (
                  <button key={r.id} onClick={() => setRecurrence(r.id)} className={`flex items-center gap-3 rounded-[15px] border-[1.5px] p-3.5 text-left ${sel ? "border-magenta-brand bg-surface-pink" : "border-line bg-white"}`}>
                    <div className={`h-5 w-5 flex-shrink-0 rounded-full border-2 ${sel ? "border-magenta-brand bg-[radial-gradient(circle,#A22D8F_0_5px,#fff_6px)]" : "border-[#cfc6dd] bg-white"}`} />
                    <div className="flex-1">
                      <div className="font-display text-[14.5px] font-bold">{r.label}</div>
                      <div className="text-xs text-muted">{r.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <FooterButton onClick={() => setStep(4)} label="Review booking ›" />
        </>
      )}

      {/* STEP 4 — review */}
      {step === 4 && (
        <>
          <div className="flex items-center gap-3 px-5 pb-3.5 pt-2">
            <BackBtn />
            <div>
              <div className="font-display text-xl font-extrabold">Review &amp; pay</div>
              <div className="text-[12.5px] text-muted">Step 4 of 4</div>
            </div>
          </div>
          <div className="flex-1 px-[18px]">
            <div className="mb-3.5 card p-4">
              <div className="flex items-center gap-3 border-b border-[#f0ebf6] pb-3.5">
                <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-surface-lav text-[22px]">{service.emoji}</div>
                <div className="flex-1">
                  <div className="font-display text-[15.5px] font-bold">{service.name}</div>
                  <div className="text-[12.5px] text-muted">{service.mode === "ROOMS" ? `${beds} bed · ${baths} bath` : `${effectiveHours} hours`}</div>
                </div>
              </div>
              <Row label="📍 Area" value={area?.name ?? ""} />
              <Row label="🗓 When" value={`${dateLabel?.label} ${dateLabel?.sub} · ${time}`} />
            </div>

            {referralEligible && (
              <button onClick={() => setApplyReferral((v) => !v)} className="mb-3.5 flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-[#e7cfe5] bg-gradient-to-r from-[#fbeef7] to-[#f3ecfa] p-3.5 text-left">
                <div className="text-2xl">🎟️</div>
                <div className="flex-1">
                  <div className="font-display text-sm font-bold text-magenta-brand">First-booking referral discount</div>
                  <div className="text-xs text-muted">{referralCode ? `Code ${referralCode} · ` : ""}{formatZar(settings.firstBookingDiscountCents)} off</div>
                </div>
                {applyReferral && <div className="rounded-lg bg-magenta-brand px-2.5 py-1 text-xs font-bold text-white">Applied</div>}
              </button>
            )}

            <div className="card p-4">
              <Line label="Service" value={formatZar(breakdown.baseCents)} />
              <Line label="Extras" value={formatZar(breakdown.addonsCents)} />
              {breakdown.recurringDiscountCents > 0 && <Line label="Recurring discount" value={`−${formatZar(breakdown.recurringDiscountCents)}`} money />}
              {breakdown.referralDiscountCents > 0 && <Line label="Referral discount" value={`−${formatZar(breakdown.referralDiscountCents)}`} magenta />}
              <div className="my-2.5 h-px bg-[#f0ebf6]" />
              <div className="flex items-center justify-between">
                <span className="font-display text-base font-bold">Total</span>
                <span className="font-display text-[22px] font-extrabold text-indigo-brand">{formatZar(breakdown.totalCents)}</span>
              </div>
            </div>
            <div className="h-4" />
          </div>
          <div className="mt-auto border-t border-[#ece6f3] bg-white px-[18px] pb-[18px] pt-3.5">
            <button disabled={submitting} onClick={submit} className="btn-primary w-full">
              {submitting ? "Preparing payment…" : "Continue to payment ›"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Counter({ label, sub, value, onDec, onInc }: { label: string; sub: string; value: number; onDec: () => void; onInc: () => void }) {
  return (
    <div className="mb-2.5 flex items-center justify-between rounded-[15px] border border-line bg-white px-4 py-3.5">
      <div>
        <div className="font-display text-[15px] font-bold">{label}</div>
        <div className="text-xs text-muted">{sub}</div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onDec} className="h-[34px] w-[34px] rounded-[10px] border-[1.5px] border-[#e0d8ea] bg-white text-lg text-indigo-brand">−</button>
        <span className="w-[18px] text-center font-display text-[17px] font-bold">{value}</span>
        <button onClick={onInc} className="h-[34px] w-[34px] rounded-[10px] border-[1.5px] border-[#e0d8ea] bg-white text-lg text-indigo-brand">+</button>
      </div>
    </div>
  );
}

function FooterTotal({ total, onClick, label }: { total: number; onClick: () => void; label: string }) {
  return (
    <div className="mt-auto flex items-center gap-3.5 border-t border-[#ece6f3] bg-white px-[18px] pb-[18px] pt-3.5">
      <div className="flex-1">
        <div className="text-[10.5px] uppercase tracking-wide text-muted-faint">Estimated total</div>
        <div className="font-display text-[21px] font-extrabold">{formatZar(total)}</div>
      </div>
      <button onClick={onClick} className="rounded-[15px] bg-brand-gradient px-6 py-3.5 font-display font-bold text-white">{label}</button>
    </div>
  );
}

function FooterButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="mt-auto border-t border-[#ece6f3] bg-white px-[18px] pb-[18px] pt-3.5">
      <button onClick={onClick} className="btn-primary w-full">{label}</button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 text-[13.5px]">
      <span className="text-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
function Line({ label, value, money, magenta }: { label: string; value: string; money?: boolean; magenta?: boolean }) {
  return (
    <div className={`flex justify-between py-1 text-sm ${money ? "text-money" : magenta ? "text-magenta-brand" : ""}`}>
      <span className={money || magenta ? "" : "text-muted-label"}>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
