"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Lock, Gift } from "lucide-react";
import { computePrice, fromPriceCents, type Recurrence } from "@/lib/pricing";
import { formatZar } from "@/lib/money";
import { servicePhoto } from "@/lib/service-photos";
import { Logo } from "@/components/ui/Logo";
import { AddressAutocomplete } from "@/components/app/AddressAutocomplete";
import { createBookingAction } from "@/app/actions/booking";

type Service = { id: string; name: string; emoji: string; tint: string; description: string; mode: "ROOMS" | "HOURS" | "EXTRAS"; basePrice: number; hourlyRate: number; minHours: number };
type Addon = { id: string; name: string; emoji: string; price: number };
type Area = { id: string; name: string };
type Settings = { perBedroomCents: number; perBathroomCents: number; weeklyDiscountPct: number; biweeklyDiscountPct: number; firstBookingDiscountCents: number; extrasMinimumCents: number };
type DateOption = { iso: string; label: string; sub: string };

const TIMES = ["07:00", "09:00", "11:00", "13:00", "15:00"];
const RECUR: { id: Recurrence; label: string; sub: string }[] = [
  { id: "ONCE", label: "One-time", sub: "Just this clean" },
  { id: "WEEKLY", label: "Weekly", sub: "Save 15% · most popular" },
  { id: "BIWEEKLY", label: "Every 2 weeks", sub: "Save 10%" },
];

export function BookingWizard({
  services, addons, areas, settings, dateOptions, referralEligible, referralCode, initialServiceId,
  loggedIn, presetRef, embedded = false,
}: {
  services: Service[]; addons: Addon[]; areas: Area[]; settings: Settings; dateOptions: DateOption[];
  referralEligible: boolean; referralCode?: string; initialServiceId?: string;
  loggedIn: boolean; presetRef?: string;
  /** Rendered inside AppShell (sidebar stays): drop the standalone brand panel. */
  embedded?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(initialServiceId ? 1 : 0);
  const [serviceId, setServiceId] = useState(initialServiceId ?? services[0]?.id);
  const [beds, setBeds] = useState(2);
  const [baths, setBaths] = useState(1);
  const [hours, setHours] = useState(3);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  // Area is derived from the chosen address; no default so it can't silently mismatch.
  const [areaId, setAreaId] = useState("");
  const [areaAutoDetected, setAreaAutoDetected] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [address, setAddress] = useState("");
  const [dateIso, setDateIso] = useState(dateOptions[1]?.iso ?? dateOptions[0]?.iso);
  const [time, setTime] = useState("09:00");
  const [recurrence, setRecurrence] = useState<Recurrence>("ONCE");
  const [applyReferral, setApplyReferral] = useState(referralEligible);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  // Guest account (collected at the end if not signed in)
  const [acctName, setAcctName] = useState("");
  const [acctEmail, setAcctEmail] = useState("");
  const [acctPhone, setAcctPhone] = useState("");
  const [acctPassword, setAcctPassword] = useState("");
  const [guestRef, setGuestRef] = useState(presetRef ?? "");
  // Guests choose explicitly whether they're new (create) or returning (sign in).
  const [authMode, setAuthMode] = useState<"create" | "signin">("create");

  const service = services.find((s) => s.id === serviceId)!;
  const effectiveHours = Math.max(hours, service.mode === "HOURS" ? service.minHours : 0);
  // Discount preview: signed-in first-booking toggle, or a guest who entered a code.
  const previewReferral = loggedIn ? applyReferral && referralEligible : authMode === "create" && guestRef.trim().length > 0;

  const breakdown = useMemo(
    () =>
      computePrice({
        service,
        beds, baths, hours: effectiveHours,
        addonCents: addonIds.map((id) => addons.find((a) => a.id === id)?.price ?? 0),
        recurrence,
        applyReferralDiscount: previewReferral,
        settings,
      }),
    [service, beds, baths, effectiveHours, addonIds, recurrence, previewReferral, addons, settings],
  );

  const toggleAddon = (id: string) =>
    setAddonIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  // Map a chosen Google address to one of our service areas, so the customer
  // never has to pick it separately (and can't pick one that contradicts the
  // address). Some areas have alternate names (e.g. eMalahleni / Witbank).
  const handleAddressSelect = (p: { description: string }) => {
    const aliases: Record<string, string[]> = { "eMalahleni (Witbank)": ["emalahleni", "witbank"] };
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const has = (k: string) => new RegExp(`\\b${esc(k)}\\b`, "i").test(p.description);
    // Pass 1: full area name or a known alias.
    let match = areas.find((a) => (aliases[a.name] ?? [a.name]).some(has));
    // Pass 2: looser first-word match (e.g. "Pretoria" -> Pretoria CBD/East).
    if (!match) match = areas.find((a) => { const w = a.name.split(/[\s(]/)[0]; return w.length >= 4 && has(w); });
    if (match) {
      setAreaId(match.id);
      setAreaAutoDetected(true);
      setShowAreaPicker(false);
    } else {
      setAreaId("");
      setAreaAutoDetected(false);
      setShowAreaPicker(true);
    }
  };

  const emailValid = /.+@.+\..+/.test(acctEmail);
  const guestReady =
    loggedIn ||
    (authMode === "create"
      ? acctName.trim().length >= 2 && emailValid && acctPassword.length >= 8
      : emailValid && acctPassword.length >= 1);

  async function submit() {
    if (!guestReady) return;
    setSubmitting(true);
    setSubmitError(undefined);
    const fd = new FormData();
    fd.set("serviceId", serviceId);
    fd.set("areaId", areaId);
    fd.set("addressText", address || areas.find((a) => a.id === areaId)?.name || "Not specified");
    fd.set("beds", String(beds));
    fd.set("baths", String(baths));
    fd.set("hours", String(effectiveHours));
    addonIds.forEach((id) => fd.append("addonIds", id));
    fd.set("recurrence", recurrence);
    // Stamp the South African offset so the booked time is the time the
    // customer picked, regardless of the (UTC) server's local zone.
    fd.set("scheduledAt", `${dateIso}T${time}:00+02:00`);
    fd.set("applyReferral", applyReferral ? "true" : "false");
    if (!loggedIn) {
      fd.set("fullName", acctName);
      fd.set("email", acctEmail);
      fd.set("phone", acctPhone);
      fd.set("password", acctPassword);
      fd.set("referralCode", guestRef);
    }
    try {
      const res = await createBookingAction(fd);
      if (res?.error) {
        setSubmitError(res.error);
        setSubmitting(false);
      }
      // success path redirects server-side
    } catch (e) {
      // A server-action redirect/sign-in surfaces as a NEXT_REDIRECT throw on the
      // client. That IS the success path, so re-throw to let Next navigate rather
      // than flashing a spurious "something went wrong" before the redirect.
      const digest = (e as { digest?: unknown })?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
      setSubmitError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const back = () => (step === 0 ? router.push(loggedIn ? "/app" : "/") : setStep((s) => s - 1));
  const BackBtn = () => (
    <button onClick={back} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-lav text-lg text-indigo-brand">‹</button>
  );
  const area = areas.find((a) => a.id === areaId);
  // Use the server-provided label for the quick-pick chips; format any other
  // (further-future) date the customer chose via the date input.
  const dateLabel = dateOptions.find((d) => d.iso === dateIso) ?? isoToDateLabel(dateIso);
  const configSummary =
    service.mode === "ROOMS"
      ? `${beds} bed · ${baths} bath`
      : service.mode === "EXTRAS"
        ? `${addonIds.length} ${addonIds.length === 1 ? "extra" : "extras"}`
        : `${effectiveHours} hours`;
  // Extras-only bookings must include at least one extra before continuing.
  const configReady = service.mode !== "EXTRAS" || addonIds.length > 0;
  // Breakdown labels read differently for extras-only bookings.
  const isExtras = service.mode === "EXTRAS";
  const baseLabel = isExtras ? "Call-out minimum" : "Service";
  const addonsLabel = isExtras ? "Tasks" : "Extras";
  const showBaseLine = !isExtras || breakdown.baseCents > 0;

  return (
    <div className={embedded ? "flex w-full flex-1 flex-col" : "lg:grid lg:min-h-[100dvh] lg:grid-cols-[minmax(0,400px)_1fr]"}>
      {/* Desktop-only brand panel with a live order summary (standalone/guest only) */}
      {!embedded && (
      <aside className="relative hidden overflow-hidden bg-hero-gradient p-9 text-white lg:flex lg:flex-col">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/[.06]" />
        <Link href={loggedIn ? "/app" : "/"} className="relative z-10" aria-label="Household Maids home"><Logo variant="white" height={30} /></Link>
        <div className="relative z-10 mt-10 flex-1">
          {step === 0 ? (
            <>
              <h2 className="font-display text-[30px] font-extrabold leading-[1.12] tracking-tight">Book a sparkling clean in a minute</h2>
              <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/80">Choose a service, size and time. You only create your account at the very end.</p>
              <div className="mt-9 flex flex-col gap-3.5 text-sm font-semibold text-white/90">
                <div className="flex items-center gap-2.5"><ShieldCheck size={18} strokeWidth={2.2} /> Vetted &amp; insured cleaners</div>
                <div className="flex items-center gap-2.5"><Lock size={18} strokeWidth={2.2} /> Secure Payfast payments</div>
                <div className="flex items-center gap-2.5"><Gift size={18} strokeWidth={2.2} /> Earn on every referral</div>
              </div>
            </>
          ) : (
            <div className="rounded-[20px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <div className="text-[12px] font-bold uppercase tracking-wide text-white/70">Your booking</div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-xl">{service.emoji}</div>
                <div>
                  <div className="font-display text-[15px] font-bold">{service.name}</div>
                  <div className="text-[12.5px] text-white/75">{configSummary}</div>
                </div>
              </div>
              {step >= 2 && (
                <div className="mt-4 flex flex-col gap-1.5 text-[13px] text-white/85">
                  <div className="flex justify-between"><span className="text-white/70">📍 Area</span><span className="font-semibold">{area?.name}</span></div>
                  {step >= 3 && <div className="flex justify-between"><span className="text-white/70">🗓 When</span><span className="font-semibold">{dateLabel?.label} {dateLabel?.sub} · {time}</span></div>}
                </div>
              )}
              <div className="my-4 h-px bg-white/15" />
              <div className="flex flex-col gap-1.5 text-[13px] text-white/85">
                {showBaseLine && <div className="flex justify-between"><span>{baseLabel}</span><span>{formatZar(breakdown.baseCents)}</span></div>}
                {breakdown.addonsCents > 0 && <div className="flex justify-between"><span>{addonsLabel}</span><span>{formatZar(breakdown.addonsCents)}</span></div>}
                {breakdown.recurringDiscountCents > 0 && <div className="flex justify-between text-white"><span>Recurring discount</span><span>−{formatZar(breakdown.recurringDiscountCents)}</span></div>}
                {breakdown.referralDiscountCents > 0 && <div className="flex justify-between text-white"><span>Referral discount</span><span>−{formatZar(breakdown.referralDiscountCents)}</span></div>}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-3">
                <span className="font-display font-bold">Total</span>
                <span className="font-display text-[26px] font-extrabold">{formatZar(breakdown.totalCents)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="relative z-10 text-[12px] text-white/55">© 2026 Household Maids · Mukhoni Cleaning Specialists</div>
      </aside>
      )}

      {/* Step content */}
      <div className={embedded ? "flex w-full flex-1 flex-col" : "flex min-h-screen flex-col bg-surface md:min-h-0 lg:min-h-[100dvh] lg:overflow-y-auto"}>
        <div className={embedded ? "mx-auto flex w-full max-w-[640px] flex-1 flex-col" : "mx-auto flex w-full max-w-[600px] flex-1 flex-col lg:py-6"}>
      {/* STEP 0, choose service */}
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
                    {formatZar(fromPriceCents(s, settings))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 1, configure */}
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

            {service.mode === "ROOMS" && (
              <>
                <Counter label="Bedrooms" sub="+R90 each" value={beds} onDec={() => setBeds((v) => Math.max(1, v - 1))} onInc={() => setBeds((v) => Math.min(8, v + 1))} />
                <Counter label="Bathrooms" sub="+R70 each" value={baths} onDec={() => setBaths((v) => Math.max(1, v - 1))} onInc={() => setBaths((v) => Math.min(6, v + 1))} />
              </>
            )}
            {service.mode === "HOURS" && (
              <Counter label="Hours needed" sub="Billed per hour" value={effectiveHours} onDec={() => setHours((v) => Math.max(service.minHours, v - 1))} onInc={() => setHours((v) => Math.min(10, v + 1))} />
            )}
            {service.mode === "EXTRAS" && (
              <div className="mb-1 flex items-center gap-2.5 rounded-[14px] border border-dashed border-[#d9c8e6] bg-surface-lav px-3.5 py-3 text-[12.5px] text-muted">
                <span className="text-base">🧺</span>
                <span>Pick the tasks you need. A {formatZar(settings.extrasMinimumCents)} call-out minimum applies.</span>
              </div>
            )}

            <div className="mb-3 mt-5 px-0.5 font-display text-[15px] font-bold">{service.mode === "EXTRAS" ? "Choose your tasks" : "Add extras"}</div>
            <div className="flex flex-col gap-2.5">
              {addons.map((a) => {
                const sel = addonIds.includes(a.id);
                return (
                  <button key={a.id} onClick={() => toggleAddon(a.id)} aria-pressed={sel} className={`flex items-center gap-3 rounded-[15px] border-[1.5px] p-3.5 text-left ${sel ? "border-magenta-brand bg-surface-pink" : "border-line bg-white"}`}>
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
          <FooterTotal total={breakdown.totalCents} onClick={() => setStep(2)} label="Continue ›" disabled={!configReady} hint={!configReady ? "Select at least one task to continue" : undefined} />
        </>
      )}

      {/* STEP 2, area */}
      {step === 2 && (
        <>
          <div className="flex items-center gap-3 px-5 pb-3.5 pt-2">
            <BackBtn />
            <div>
              <div className="font-display text-xl font-extrabold">Where are you?</div>
              <div className="text-[12.5px] text-muted">Step 2 of 4</div>
            </div>
          </div>
          <div className="flex-1 px-[18px]">
            <label className="mb-1.5 block px-0.5 font-display text-sm font-bold text-muted-label">Street address</label>
            <div className="mb-4"><AddressAutocomplete value={address} onChange={setAddress} onSelect={handleAddressSelect} placeholder="Start typing your address" /></div>

            {areaId && areaAutoDetected && !showAreaPicker ? (
              // Area detected from the chosen address, with an option to correct it.
              <div className="flex items-center gap-3 rounded-[15px] border-[1.5px] border-magenta-brand bg-surface-pink p-3.5">
                <span className="text-xl">📍</span>
                <div className="flex-1">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-muted-label">Your area</div>
                  <div className="font-display text-[15px] font-bold text-magenta-brand">{areas.find((a) => a.id === areaId)?.name}</div>
                </div>
                <button onClick={() => setShowAreaPicker(true)} className="text-[13px] font-bold text-indigo-brand underline">Change</button>
              </div>
            ) : (
              <>
                <div className="mb-2 px-0.5 font-display text-sm font-bold text-muted-label">Select your area</div>
                {address.trim().length >= 5 && !areaId && (
                  <div className="mb-3 rounded-[12px] bg-surface-lav px-3.5 py-2.5 text-[12.5px] text-muted">
                    We couldn&apos;t match that address to a service area. Pick the closest one below.
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2.5">
                  {areas.map((a) => (
                    <button key={a.id} onClick={() => { setAreaId(a.id); setAreaAutoDetected(false); }} aria-pressed={a.id === areaId} className={`rounded-[13px] border-[1.5px] px-2 py-2.5 text-center text-[13.5px] font-bold ${a.id === areaId ? "border-magenta-brand bg-surface-pink text-magenta-brand" : "border-line-input bg-white text-[#5f5878]"}`}>{a.name}</button>
                  ))}
                </div>
              </>
            )}
          </div>
          <FooterButton
            onClick={() => setStep(3)}
            label="Continue to schedule ›"
            disabled={address.trim().length < 5 || !areaId}
            hint={address.trim().length < 5 ? "Enter your street address to continue" : !areaId ? "Select your area to continue" : undefined}
          />
        </>
      )}

      {/* STEP 3, schedule */}
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
            <div className="mb-3 grid grid-cols-5 gap-2">
              {dateOptions.map((d) => (
                <button key={d.iso} onClick={() => setDateIso(d.iso)} className={`rounded-[13px] border-[1.5px] py-2.5 text-center ${d.iso === dateIso ? "border-magenta-brand bg-surface-pink text-magenta-brand" : "border-line-input bg-white text-[#5f5878]"}`}>
                  <div className="text-sm font-extrabold">{d.label}</div>
                  <div className="text-[10.5px] opacity-70">{d.sub}</div>
                </button>
              ))}
            </div>
            <label className="mb-5 flex items-center justify-between gap-3 rounded-[13px] border-[1.5px] border-line-input bg-white px-4 py-3">
              <span className="text-[13px] font-semibold text-muted-label">Or choose another date</span>
              <input
                type="date"
                min={dateOptions[0]?.iso}
                value={dateIso}
                onChange={(e) => e.target.value && setDateIso(e.target.value)}
                className="bg-transparent text-[13.5px] font-bold text-indigo-brand outline-none"
              />
            </label>
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

      {/* STEP 4, review */}
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
            <div className={`mb-3.5 card p-4 ${embedded || loggedIn ? "" : "lg:hidden"}`}>
              <div className="flex items-center gap-3 border-b border-[#f0ebf6] pb-3.5">
                <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-surface-lav text-[22px]">{service.emoji}</div>
                <div className="flex-1">
                  <div className="font-display text-[15.5px] font-bold">{service.name}</div>
                  <div className="text-[12.5px] text-muted">{configSummary}</div>
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

            {!loggedIn && (
              <div className="mb-3.5 card p-4">
                {/* Clear toggle: new customers create an account, returning ones sign in. */}
                <div className="mb-3.5 flex rounded-[13px] bg-surface-lav p-1">
                  <button
                    type="button"
                    onClick={() => setAuthMode("create")}
                    className={`flex-1 rounded-[10px] py-2 text-[13.5px] font-bold transition ${authMode === "create" ? "bg-white text-indigo-brand shadow-sm" : "text-muted-label"}`}
                  >
                    I&apos;m new
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("signin")}
                    className={`flex-1 rounded-[10px] py-2 text-[13.5px] font-bold transition ${authMode === "signin" ? "bg-white text-indigo-brand shadow-sm" : "text-muted-label"}`}
                  >
                    I have an account
                  </button>
                </div>
                <div className="mb-3 text-[12.5px] text-muted">
                  {authMode === "create" ? "Create your account to confirm your booking." : "Sign in with your email and password to confirm."}
                </div>
                <div className="flex flex-col gap-2.5">
                  {authMode === "create" && (
                    <input value={acctName} onChange={(e) => setAcctName(e.target.value)} aria-label="Full name" placeholder="Full name" autoComplete="name" className="field bg-white" />
                  )}
                  <input value={acctEmail} onChange={(e) => setAcctEmail(e.target.value)} type="email" aria-label="Email" placeholder="Email" autoComplete="email" className="field bg-white" />
                  {authMode === "create" && (
                    <input value={acctPhone} onChange={(e) => setAcctPhone(e.target.value)} type="tel" aria-label="Mobile number" placeholder="Mobile number (optional)" autoComplete="tel" className="field bg-white" />
                  )}
                  <input value={acctPassword} onChange={(e) => setAcctPassword(e.target.value)} type="password" aria-label="Password" placeholder={authMode === "create" ? "Create a password (min 8 chars)" : "Your password"} autoComplete={authMode === "create" ? "new-password" : "current-password"} className="field bg-white" />
                  {authMode === "create" && (
                    <>
                      <div className="flex items-center gap-2.5 rounded-2xl border border-dashed border-[#d9c8e6] bg-surface-lav px-3.5 py-2.5">
                        <span className="text-lg">🎟️</span>
                        <input value={guestRef} onChange={(e) => setGuestRef(e.target.value)} aria-label="Referral code" placeholder="Referral code (optional)" className="w-full border-none bg-transparent text-[14px] font-bold uppercase tracking-wide text-magenta-brand outline-none placeholder:font-normal placeholder:normal-case placeholder:text-muted-faint" />
                      </div>
                      {guestRef.trim() && <div className="text-[12px] font-semibold text-magenta-brand">🎉 {formatZar(settings.firstBookingDiscountCents)} first-booking discount applied</div>}
                    </>
                  )}
                </div>
                <p className="mt-2 text-center text-[11.5px] text-muted-faint">
                  By continuing you agree to our{" "}
                  <Link href="/terms" className="font-semibold text-magenta-brand">Terms</Link> &amp;{" "}
                  <Link href="/privacy" className="font-semibold text-magenta-brand">Privacy Policy</Link>.
                </p>
              </div>
            )}

            <div className={`card p-4 ${embedded || loggedIn ? "" : "lg:hidden"}`}>
              {showBaseLine && <Line label={baseLabel} value={formatZar(breakdown.baseCents)} />}
              {breakdown.addonsCents > 0 && <Line label={addonsLabel} value={formatZar(breakdown.addonsCents)} />}
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
            {submitError && (
              <div className="mb-3 rounded-2xl border border-[#f0d6d6] bg-[#fdf3f3] px-4 py-3 text-sm font-semibold text-[#d05656]">
                {submitError}
              </div>
            )}
            <button disabled={submitting || !guestReady} onClick={submit} className="btn-primary w-full disabled:opacity-50">
              {submitting ? "Preparing payment…" : loggedIn ? "Continue to payment ›" : authMode === "create" ? "Create account & pay ›" : "Sign in & pay ›"}
            </button>
            {!loggedIn && (
              <p className="mt-2.5 text-center text-[12.5px] text-muted-soft">
                {authMode === "create" ? (
                  <>Already have an account?{" "}
                    <button type="button" onClick={() => setAuthMode("signin")} className="font-bold text-magenta-brand underline">Sign in</button> instead.</>
                ) : (
                  <>New to Household Maids?{" "}
                    <button type="button" onClick={() => setAuthMode("create")} className="font-bold text-magenta-brand underline">Create an account</button>.</>
                )}
              </p>
            )}
          </div>
        </>
      )}
        </div>
      </div>
    </div>
  );
}

/** Formats an ISO date (YYYY-MM-DD) into the same {label, sub} shape as the
 *  server-provided quick-pick options, for custom future dates. */
function isoToDateLabel(iso: string): DateOption {
  const d = new Date(`${iso}T12:00:00`);
  return {
    iso,
    label: d.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric" }),
    sub: d.toLocaleDateString("en-ZA", { month: "short" }),
  };
}

function Counter({ label, sub, value, onDec, onInc }: { label: string; sub: string; value: number; onDec: () => void; onInc: () => void }) {
  return (
    <div className="mb-2.5 flex items-center justify-between rounded-[15px] border border-line bg-white px-4 py-3.5">
      <div>
        <div className="font-display text-[15px] font-bold">{label}</div>
        <div className="text-xs text-muted">{sub}</div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onDec} aria-label={`Decrease ${label.toLowerCase()}`} className="h-[34px] w-[34px] rounded-[10px] border-[1.5px] border-[#e0d8ea] bg-white text-lg text-indigo-brand">−</button>
        <span className="w-[18px] text-center font-display text-[17px] font-bold">{value}</span>
        <button onClick={onInc} aria-label={`Increase ${label.toLowerCase()}`} className="h-[34px] w-[34px] rounded-[10px] border-[1.5px] border-[#e0d8ea] bg-white text-lg text-indigo-brand">+</button>
      </div>
    </div>
  );
}

function FooterTotal({ total, onClick, label, disabled, hint }: { total: number; onClick: () => void; label: string; disabled?: boolean; hint?: string }) {
  return (
    <div className="mt-auto flex items-center gap-3.5 border-t border-[#ece6f3] bg-white px-[18px] pb-[18px] pt-3.5">
      <div className="flex-1">
        <div className="text-[10.5px] uppercase tracking-wide text-muted-faint">{hint ?? "Estimated total"}</div>
        <div className="font-display text-[21px] font-extrabold">{formatZar(total)}</div>
      </div>
      <button onClick={onClick} disabled={disabled} className="rounded-[15px] bg-brand-gradient px-6 py-3.5 font-display font-bold text-white disabled:opacity-50">{label}</button>
    </div>
  );
}

function FooterButton({ onClick, label, disabled, hint }: { onClick: () => void; label: string; disabled?: boolean; hint?: string }) {
  return (
    <div className="mt-auto border-t border-[#ece6f3] bg-white px-[18px] pb-[18px] pt-3.5">
      {disabled && hint && <div className="mb-2 text-center text-[12px] font-semibold text-muted-faint">{hint}</div>}
      <button onClick={onClick} disabled={disabled} className="btn-primary w-full disabled:opacity-50">{label}</button>
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
