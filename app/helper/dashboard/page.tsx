import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { formatZar } from "@/lib/money";
import { AppShell } from "@/components/app/AppShell";
import { logoutAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function HelperDashboardPage() {
  const user = await requireRole("HELPER");

  const profile = await prisma.helperProfile.findUnique({
    where: { userId: user.id },
    include: { user: true },
  });

  const firstName = (profile?.user.fullName ?? user.name ?? "there").split(" ")[0];

  // Pending review state, no jobs surface until approved.
  if (!profile || profile.status !== "APPROVED") {
    return (
      <AppShell variant="helper" tabs={false}>
        <Header firstName={firstName} weekCents={0} rating={profile?.rating ?? 0} />
        <div className="px-[18px] py-5">
          <div className="card flex flex-col items-center p-6 text-center">
            <div className="text-[40px]">🕵️</div>
            <div className="mt-3 font-display text-[16px] font-bold">Your application is under review</div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Our vetting team is checking your details. We&apos;ll let you know the moment you&apos;re approved -               usually within 2–3 working days.
            </p>
          </div>
          <LogoutForm />
        </div>
      </AppShell>
    );
  }

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [weekAgg, todayJobs, upcomingJobs] = await Promise.all([
    prisma.booking.aggregate({
      where: { helperId: profile.id, status: "COMPLETED", scheduledAt: { gte: weekAgo, lte: now } },
      _sum: { totalCents: true },
    }),
    prisma.booking.findMany({
      where: { helperId: profile.id, scheduledAt: { gte: startOfToday, lt: endOfToday } },
      include: { service: true, customer: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.booking.findMany({
      where: { helperId: profile.id, scheduledAt: { gte: endOfToday }, status: { not: "CANCELLED" } },
      include: { service: true, customer: true },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
  ]);

  const weekCents = weekAgg._sum.totalCents ?? 0;
  const showUpcoming = todayJobs.length === 0;
  const jobs = showUpcoming ? upcomingJobs : todayJobs;

  return (
    <AppShell variant="helper" tabs={false}>
      <Header firstName={firstName} weekCents={weekCents} rating={profile.rating} />

      <div className="px-[18px] py-5">
        <div className="mb-3.5 font-display text-[16px] font-bold">{showUpcoming ? "Upcoming" : "Today's jobs"}</div>

        {jobs.length === 0 ? (
          <div className="card p-6 text-center text-[13.5px] text-muted">No jobs scheduled yet. We&apos;ll match you soon. 🧹</div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {jobs.map((b) => {
              const time = new Date(b.scheduledAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
              const detail =
                b.service.mode === "ROOMS" ? `${b.beds} bed ${b.baths} bath` : `${b.hours}h`;
              return (
                <Link key={b.id} href={`/helper/jobs/${b.reference}`} className="card flex items-center gap-3.5 p-3.5 shadow-card">
                  <div className="flex flex-col items-center justify-center rounded-[13px] bg-surface-lav px-3 py-2 text-center">
                    <div className="font-display text-[14px] font-extrabold text-indigo-brand">{time}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[14.5px] font-bold">
                      {b.service.name} · {b.customer.fullName.split(" ")[0]}
                    </div>
                    <div className="mt-0.5 truncate text-[12px] text-muted">
                      📍 {b.addressText} · {detail}
                    </div>
                  </div>
                  <div className="font-display text-[14px] font-bold text-money">{formatZar(b.totalCents)}</div>
                </Link>
              );
            })}
          </div>
        )}

        <LogoutForm />
      </div>
    </AppShell>
  );
}

function Header({ firstName, weekCents, rating }: { firstName: string; weekCents: number; rating: number }) {
  return (
    <div className="rounded-b-[26px] bg-brand-gradient-160 px-5 pb-6 pt-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 font-display font-bold text-white">{firstName[0]}</div>
        <div>
          <div className="text-[12px] font-bold uppercase tracking-wide text-white/70">Helper · Vetted ✅</div>
          <div className="font-display text-[20px] font-extrabold text-white">Hi {firstName} 👋</div>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <div className="flex-1 rounded-[16px] border border-white/15 bg-white/10 p-3.5">
          <div className="text-[11.5px] text-white/70">This week</div>
          <div className="mt-1 font-display text-[20px] font-extrabold text-white">{formatZar(weekCents)}</div>
        </div>
        <div className="flex-1 rounded-[16px] border border-white/15 bg-white/10 p-3.5">
          <div className="text-[11.5px] text-white/70">Rating</div>
          <div className="mt-1 font-display text-[20px] font-extrabold text-white">⭐ {rating.toFixed(1)}</div>
        </div>
      </div>
    </div>
  );
}

function LogoutForm() {
  return (
    <form action={logoutAction} className="mt-6 lg:hidden">
      <button className="w-full rounded-[15px] border-[1.5px] border-line-input bg-white py-3 text-[13.5px] font-semibold text-muted">
        Log out
      </button>
    </form>
  );
}
