"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { createEnquiryAction } from "@/app/actions/quote";

type Service = { id: string; name: string; emoji: string; description: string };
type Area = { id: string; name: string };

export function QuoteForm({
  services,
  areas,
  initialServiceId,
}: {
  services: Service[];
  areas: Area[];
  initialServiceId?: string;
}) {
  const [serviceId, setServiceId] = useState(initialServiceId ?? services[0]?.id);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [areaId, setAreaId] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [reference, setReference] = useState<string>();

  const ready = name.trim().length >= 2 && /.+@.+\..+/.test(email) && details.trim().length >= 10;

  async function submit() {
    if (!ready) return;
    setSubmitting(true);
    setError(undefined);
    const fd = new FormData();
    fd.set("serviceId", serviceId);
    fd.set("areaId", areaId);
    fd.set("name", name);
    fd.set("email", email);
    fd.set("phone", phone);
    fd.set("details", details);
    try {
      const res = await createEnquiryAction(fd);
      if (res?.error) setError(res.error);
      else if (res?.reference) setReference(res.reference);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (reference) {
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#e7f6ec] text-money">
          <CheckCircle2 size={30} strokeWidth={2.2} />
        </div>
        <div className="font-display text-xl font-extrabold">Quote request received</div>
        <p className="mt-2 text-[14px] text-muted">
          Thanks {name.trim().split(" ")[0]}. Your reference is{" "}
          <span className="font-bold text-indigo-brand">{reference}</span>. Our team will review the
          details and email you a tailored quote, usually within one business day.
        </p>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link href="/" className="rounded-[14px] border border-line-input bg-white px-5 py-3 text-[14px] font-bold text-indigo-brand">Back home</Link>
          <Link href="/book" className="btn-primary px-5 py-3 text-[14px]">Book an instant service</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Service picker (only if more than one quote-only service) */}
      {services.length > 1 && (
        <div>
          <label className="mb-2 block px-0.5 font-display text-sm font-bold text-muted-label">What do you need?</label>
          <div className="flex flex-col gap-2.5">
            {services.map((s) => {
              const sel = s.id === serviceId;
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setServiceId(s.id)}
                  className={`flex items-center gap-3 rounded-[15px] border-[1.5px] p-3.5 text-left ${sel ? "border-magenta-brand bg-surface-pink" : "border-line bg-white"}`}
                >
                  <div className="text-xl">{s.emoji}</div>
                  <div className="flex-1">
                    <div className="font-display text-[14.5px] font-bold">{s.name}</div>
                    <div className="text-[12px] text-muted">{s.description}</div>
                  </div>
                  <div className={`h-5 w-5 flex-shrink-0 rounded-full border-2 ${sel ? "border-magenta-brand bg-[radial-gradient(circle,#A22D8F_0_5px,#fff_6px)]" : "border-[#cfc6dd] bg-white"}`} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="card flex flex-col gap-2.5 p-4">
        <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Full name" placeholder="Full name" autoComplete="name" className="field bg-white" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" aria-label="Email" placeholder="Email" autoComplete="email" className="field bg-white" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" aria-label="Mobile number" placeholder="Mobile number (optional)" autoComplete="tel" className="field bg-white" />
        <select value={areaId} onChange={(e) => setAreaId(e.target.value)} aria-label="Service area" className="field bg-white text-[#3f3a57]">
          <option value="">Select your area (optional)</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          aria-label="Job details"
          placeholder="Tell us about the job, e.g. number of windows, floors, inside and outside, access and any special requirements."
          rows={5}
          className="field resize-none bg-white"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-[#f0d6d6] bg-[#fdf3f3] px-4 py-3 text-sm font-semibold text-[#d05656]">{error}</div>
      )}

      <button disabled={submitting || !ready} onClick={submit} className="btn-primary w-full disabled:opacity-50">
        {submitting ? "Sending…" : "Request my quote ›"}
      </button>
      <p className="text-center text-[11.5px] text-muted-faint">
        By submitting you agree to our{" "}
        <Link href="/terms" className="font-semibold text-magenta-brand">Terms</Link> &amp;{" "}
        <Link href="/privacy" className="font-semibold text-magenta-brand">Privacy Policy</Link>.
      </p>
    </div>
  );
}
