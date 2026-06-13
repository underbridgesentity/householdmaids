import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";

export default function HelperSubmittedPage() {
  const steps: { icon: string; label: string; tone: "done" | "pending" | "todo" }[] = [
    { icon: "✓", label: "Documents received", tone: "done" },
    { icon: "✓", label: "References submitted", tone: "done" },
    { icon: "⏳", label: "Background check in progress", tone: "pending" },
    { icon: "○", label: "Welcome call & onboarding", tone: "todo" },
  ];

  return (
    <AppShell sidebar={false} tabs={false} narrow>
      <div className="flex min-h-screen flex-col px-[18px] py-10 md:min-h-0 md:h-full">
        <div className="flex flex-1 flex-col items-center text-center">
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-brand-gradient text-[40px] text-white shadow-card">
            ✓
          </div>
          <h1 className="mt-6 font-display text-[26px] font-extrabold tracking-tight">Application received!</h1>
          <p className="mt-3 max-w-[300px] text-[14.5px] leading-relaxed text-muted">
            Our team is reviewing your details. Vetting usually takes 2–3 working days.
          </p>

          <div className="mt-7 w-full card p-4 text-left">
            {steps.map((s) => (
              <div key={s.label} className="flex items-center gap-3 py-2">
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm ${
                    s.tone === "done"
                      ? "bg-money text-white"
                      : s.tone === "pending"
                        ? "animate-pulseSoft bg-[#fcefd8] text-orange-accent"
                        : "bg-[#e3ddec] text-muted-faint"
                  }`}
                >
                  {s.icon}
                </div>
                <div
                  className={`font-display text-[14px] ${
                    s.tone === "todo" ? "font-semibold text-muted-faint" : "font-bold text-ink"
                  }`}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <Link href="/" className="btn-ghost block w-full text-center">Done</Link>
          <div className="mt-3 text-center text-[12.5px] text-muted">
            Already approved?{" "}
            <Link href="/login" className="font-bold text-magenta-brand">Sign in</Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
