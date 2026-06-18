import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";

/** Placeholder for admin sections being built in later phases of the overhaul. */
export function ComingSoon({ title, subtitle, blurb }: { title: string; subtitle?: string; blurb: string }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="flex flex-col items-center justify-center rounded-[18px] border border-dashed border-line-input bg-white/60 px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-lav text-magenta-brand">
          <Hammer size={26} strokeWidth={2.2} />
        </div>
        <div className="mt-4 font-display text-lg font-bold text-ink">Being built</div>
        <p className="mt-1 max-w-md text-[13.5px] text-muted">{blurb}</p>
      </div>
    </div>
  );
}
