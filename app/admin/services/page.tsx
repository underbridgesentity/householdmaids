import { prisma } from "@/lib/db";
import { upsertServiceAction } from "@/app/actions/admin";
import { ServiceCard, type ServiceCardData } from "@/components/admin/ServiceCard";

export default async function ServicesPage() {
  const services = await prisma.service.findMany({ orderBy: { sortOrder: "asc" } });

  const cards: ServiceCardData[] = services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    emoji: s.emoji,
    mode: s.mode,
    basePriceRands: Math.round(s.basePrice / 100),
    hourlyRateRands: Math.round(s.hourlyRate / 100),
    minHours: s.minHours,
    active: s.active,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Services &amp; pricing</h1>
          <p className="mt-1 text-[14px] text-muted">Edit names, descriptions and base rates inline.</p>
        </div>

        {/* Add service: posts defaults with no id → create path in the action. */}
        <form action={upsertServiceAction}>
          <input type="hidden" name="name" value="New service" />
          <input type="hidden" name="description" value="Describe this service" />
          <input type="hidden" name="emoji" value="🧽" />
          <input type="hidden" name="mode" value="ROOMS" />
          <input type="hidden" name="basePriceRands" value="350" />
          <input type="hidden" name="hourlyRateRands" value="120" />
          <input type="hidden" name="minHours" value="2" />
          <input type="hidden" name="active" value="true" />
          <button type="submit" className="btn-primary py-3 text-[14px]">+ Add service</button>
        </form>
      </div>

      <div className="flex items-start gap-3 rounded-[14px] border border-line bg-surface-lav px-4 py-3">
        <span className="text-[16px]">ℹ️</span>
        <p className="text-[12.5px] leading-snug text-muted">
          Room-based services add R90/bedroom + R70/bathroom (these rates live in Rewards &amp; discounts).
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="card p-8 text-center text-[14px] text-muted">No services yet. Add your first one.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <ServiceCard key={c.id} service={c} />
          ))}
        </div>
      )}
    </div>
  );
}
