"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { submitHelperApplicationAction } from "@/app/actions/helper";

type Area = { id: string; name: string };

/** 3-step helper onboarding wizard. Submits to submitHelperApplicationAction. */
export function HelperApplication({ areas }: { areas: Area[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState("");
  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("Cheque");
  const [clearanceConsent, setClearanceConsent] = useState(false);
  const [clearanceFile, setClearanceFile] = useState<File | null>(null);
  const [ref1Name, setRef1Name] = useState("");
  const [ref1Phone, setRef1Phone] = useState("");
  const [ref1Rel, setRef1Rel] = useState("");
  const [ref2Name, setRef2Name] = useState("");
  const [ref2Phone, setRef2Phone] = useState("");
  const [ref2Rel, setRef2Rel] = useState("");

  const progress = [33, 66, 100][step];

  const toggleArea = (id: string) =>
    setAreaIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const back = () => (step === 0 ? router.push("/helper") : setStep((s) => s - 1));
  const BackBtn = () => (
    <button onClick={back} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-lav text-lg text-indigo-brand">‹</button>
  );

  const step1Ready = fullName && email && phone && password.length >= 8 && idNumber && idFile && selfieFile;
  const step2Ready = areaIds.length > 0 && yearsExperience !== "" && clearanceConsent && ref1Name.trim() && ref1Phone.trim();
  const step3Ready = bank && accountNumber && accountType;

  async function submit() {
    setSubmitting(true);
    setError(undefined);
    const fd = new FormData();
    fd.set("fullName", fullName);
    fd.set("email", email);
    fd.set("phone", phone);
    fd.set("password", password);
    fd.set("idNumber", idNumber);
    fd.set("yearsExperience", yearsExperience || "0");
    areaIds.forEach((id) => fd.append("areaIds", id));
    fd.set("bank", bank);
    fd.set("accountNumber", accountNumber);
    fd.set("accountType", accountType);
    fd.set("clearanceConsent", clearanceConsent ? "true" : "false");
    fd.set("ref1Name", ref1Name);
    fd.set("ref1Phone", ref1Phone);
    fd.set("ref1Relationship", ref1Rel);
    fd.set("ref2Name", ref2Name);
    fd.set("ref2Phone", ref2Phone);
    fd.set("ref2Relationship", ref2Rel);
    if (idFile) fd.set("idDoc", idFile);
    if (selfieFile) fd.set("selfie", selfieFile);
    if (clearanceFile) fd.set("clearanceDoc", clearanceFile);
    try {
      const res = await submitHelperApplicationAction(fd);
      if (res?.error) {
        setError(res.error);
        setSubmitting(false);
      }
      // success path redirects server-side
    } catch {
      setError("Something went wrong submitting your application. Please try again.");
      setSubmitting(false);
    }
  }

  const steps = ["Your details", "Experience & areas", "Banking"];
  return (
    <div className="lg:grid lg:min-h-[100dvh] lg:grid-cols-[minmax(0,400px)_1fr]">
      {/* Desktop brand panel */}
      <aside className="relative hidden overflow-hidden bg-hero-gradient p-9 text-white lg:flex lg:flex-col">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/[.06]" />
        <Link href="/" className="relative z-10" aria-label="Household Maids home"><Logo variant="white" height={30} /></Link>
        <div className="relative z-10 mt-10 flex-1">
          <div className="text-[50px]">🧽</div>
          <h2 className="mt-4 font-display text-[28px] font-extrabold leading-[1.12] tracking-tight">Join the Household Maids team</h2>
          <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/80">A quick 3-step application. We verify your details, then get you earning, paid every Friday.</p>
          <div className="mt-9 flex flex-col gap-3">
            {steps.map((label, i) => (
              <div key={label} className={`flex items-center gap-3 text-sm font-semibold ${i <= step ? "text-white" : "text-white/55"}`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] ${i < step ? "bg-white text-indigo-brand" : i === step ? "bg-white/25" : "bg-white/10"}`}>{i < step ? "✓" : i + 1}</span>
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-[12px] text-white/55">🔒 Your ID &amp; banking details are encrypted.</div>
      </aside>

      {/* Step content */}
      <div className="flex min-h-screen flex-col bg-surface md:min-h-0 lg:min-h-[100dvh] lg:overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[600px] flex-1 flex-col lg:py-6">
      {/* Header + progress */}
      <div className="px-5 pb-3.5 pt-2">
        <div className="flex items-center gap-3">
          <BackBtn />
          <div>
            <div className="font-display text-xl font-extrabold">
              {step === 0 ? "Your details" : step === 1 ? "Experience" : "Get paid"}
            </div>
            <div className="text-[12.5px] text-muted">
              {step === 0
                ? "Step 1 of 3 · Verification"
                : step === 1
                  ? "Step 2 of 3 · Vetting"
                  : "Step 3 of 3 · Banking"}
            </div>
          </div>
        </div>
        <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-brand-gradient transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* STEP 1, details */}
      {step === 0 && (
        <>
          <div className="flex-1 px-[18px]">
            <label className="label">Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Thandi Mokoena" className="field mb-3.5 bg-white" />
            <label className="label">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="field mb-3.5 bg-white" />
            <label className="label">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="082 000 0000" className="field mb-3.5 bg-white" />
            <label className="label">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="field mb-3.5 bg-white" />
            <label className="label">ID number</label>
            <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="South African ID" className="field mb-4 bg-white" />

            <div className="grid grid-cols-2 gap-3">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-[15px] border-[1.5px] border-dashed border-[#cfc6dd] bg-surface-lav py-5 text-center">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
                />
                <div className="text-[26px]">🪪</div>
                <div className="mt-1 font-display text-[13px] font-bold">Upload ID</div>
                <div className="mt-0.5 max-w-full truncate px-2 text-[11.5px] font-semibold text-money">
                  {idFile ? `✓ ${idFile.name}` : "Tap to upload"}
                </div>
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-[15px] border-[1.5px] border-dashed border-[#cfc6dd] bg-surface-lav py-5 text-center">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)}
                />
                <div className="text-[26px]">🤳</div>
                <div className="mt-1 font-display text-[13px] font-bold">Selfie</div>
                <div className="mt-0.5 max-w-full truncate px-2 text-[11.5px] font-semibold text-money">
                  {selfieFile ? `✓ ${selfieFile.name}` : "Tap to upload"}
                </div>
              </label>
            </div>
            <div className="h-4" />
          </div>
          <FooterButton disabled={!step1Ready} onClick={() => setStep(1)} label="Continue ›" />
        </>
      )}

      {/* STEP 2, experience */}
      {step === 1 && (
        <>
          <div className="flex-1 px-[18px]">
            <div className="mb-3 px-0.5 font-display text-sm font-bold text-muted-label">Areas you can work in</div>
            <div className="mb-5 flex flex-wrap gap-2.5">
              {areas.map((a) => {
                const sel = areaIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleArea(a.id)}
                    aria-pressed={sel}
                    className={`rounded-full border-[1.5px] px-4 py-2 text-[13.5px] font-bold ${sel ? "border-magenta-brand bg-surface-pink text-magenta-brand" : "border-line-input bg-white text-[#5f5878]"}`}
                  >
                    {a.name}
                  </button>
                );
              })}
            </div>

            <label className="label">Years of experience</label>
            <input
              type="number"
              min={0}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              placeholder="e.g. 4"
              className="field mb-5 bg-white"
            />

            {/* Contactable references */}
            <div className="mb-1.5 px-0.5 font-display text-sm font-bold text-muted-label">Contactable references</div>
            <div className="mb-2 px-0.5 text-[12px] text-muted">A previous employer or someone who can vouch for your work. At least one required.</div>
            <div className="mb-3 rounded-[15px] border border-line bg-white p-3.5">
              <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-muted-faint">Reference 1</div>
              <input value={ref1Name} onChange={(e) => setRef1Name(e.target.value)} placeholder="Full name" className="field mb-2.5 bg-white" />
              <input value={ref1Phone} onChange={(e) => setRef1Phone(e.target.value)} placeholder="Phone number" className="field mb-2.5 bg-white" />
              <input value={ref1Rel} onChange={(e) => setRef1Rel(e.target.value)} placeholder="Relationship (e.g. former employer)" className="field bg-white" />
            </div>
            <div className="mb-5 rounded-[15px] border border-line bg-white p-3.5">
              <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-muted-faint">Reference 2 · optional</div>
              <input value={ref2Name} onChange={(e) => setRef2Name(e.target.value)} placeholder="Full name" className="field mb-2.5 bg-white" />
              <input value={ref2Phone} onChange={(e) => setRef2Phone(e.target.value)} placeholder="Phone number" className="field mb-2.5 bg-white" />
              <input value={ref2Rel} onChange={(e) => setRef2Rel(e.target.value)} placeholder="Relationship" className="field bg-white" />
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setClearanceConsent((v) => !v)}
                aria-pressed={clearanceConsent}
                className={`flex items-start gap-3 rounded-[15px] border-[1.5px] p-3.5 text-left ${clearanceConsent ? "border-magenta-brand bg-surface-pink" : "border-line bg-white"}`}
              >
                <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border-[1.5px] text-sm text-white ${clearanceConsent ? "border-magenta-brand bg-magenta-brand" : "border-[#d6cee2] bg-white"}`}>✓</div>
                <div>
                  <div className="font-display text-[14px] font-bold">Police clearance consent</div>
                  <div className="text-[12.5px] text-muted">I consent to Household Maids running a police clearance / background check as part of vetting.</div>
                </div>
              </button>
              <label className="flex cursor-pointer items-center gap-3 rounded-[15px] border-[1.5px] border-dashed border-[#cfc6dd] bg-surface-lav p-3.5 text-left">
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setClearanceFile(e.target.files?.[0] ?? null)} />
                <div className="text-xl">🛡️</div>
                <div className="flex-1">
                  <div className="font-display text-[13.5px] font-bold">Police clearance certificate <span className="font-semibold text-muted">· optional</span></div>
                  <div className="truncate text-[12px] font-semibold text-money">{clearanceFile ? `✓ ${clearanceFile.name}` : "Already have one? Upload it to speed up vetting."}</div>
                </div>
              </label>
            </div>
            <div className="h-4" />
          </div>
          <FooterButton disabled={!step2Ready} onClick={() => setStep(2)} label="Continue ›" />
        </>
      )}

      {/* STEP 3, banking */}
      {step === 2 && (
        <>
          <div className="flex-1 px-[18px]">
            <label className="label">Bank</label>
            <input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="e.g. FNB" className="field mb-3.5 bg-white" />
            <label className="label">Account number</label>
            <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account number" className="field mb-3.5 bg-white" />
            <label className="label">Account type</label>
            <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="field mb-4 bg-white">
              <option>Cheque</option>
              <option>Savings</option>
              <option>Transmission</option>
            </select>

            <div className="flex items-center gap-3 rounded-[15px] border border-[#cfe8d8] bg-[#eef6f0] p-3.5">
              <div className="text-xl">🔒</div>
              <div className="text-[12.5px] font-semibold text-money-dark">
                Your banking details are encrypted and stored securely. Only used for your Friday payouts.
              </div>
            </div>
            <div className="h-4" />
          </div>
          <div className="mt-auto border-t border-[#ece6f3] bg-white px-[18px] pb-[18px] pt-3.5">
            {error && (
              <div className="mb-3 rounded-2xl border border-[#f0d6d6] bg-[#fdf3f3] px-4 py-3 text-sm font-semibold text-[#d05656]">
                {error}
              </div>
            )}
            <button disabled={submitting || !step3Ready} onClick={submit} className="btn-primary w-full disabled:opacity-50">
              {submitting ? "Submitting…" : "Submit application ›"}
            </button>
          </div>
        </>
      )}
        </div>
      </div>
    </div>
  );
}

function FooterButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <div className="mt-auto border-t border-[#ece6f3] bg-white px-[18px] pb-[18px] pt-3.5">
      <button onClick={onClick} disabled={disabled} className="btn-primary w-full disabled:opacity-50">
        {label}
      </button>
    </div>
  );
}
