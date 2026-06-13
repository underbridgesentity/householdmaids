import { getSettings } from "@/lib/settings";
import { updateSettingsAction } from "@/app/actions/admin";

export default async function RewardsPage() {
  const s = await getSettings();
  const r = (cents: number) => (cents / 100).toString();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Rewards &amp; discounts</h1>
        <p className="mt-1 text-[14px] text-muted">Tune the program-wide incentives. Changes apply to new bookings immediately.</p>
      </div>

      <form action={updateSettingsAction} className="card max-w-2xl p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field name="referrerRewardRands" label="Referrer reward (R)" defaultValue={r(s.referrerRewardCents)} hint="Paid to the referrer when a friend's first booking clears." />
          <Field name="firstBookingDiscountRands" label="First-booking discount (R)" defaultValue={r(s.firstBookingDiscountCents)} hint="Off a new user's first paid booking." />
          <Field name="weeklyDiscountPct" label="Weekly discount (%)" defaultValue={String(s.weeklyDiscountPct)} step="1" hint="For weekly recurring bookings." />
          <Field name="biweeklyDiscountPct" label="Every-2-weeks discount (%)" defaultValue={String(s.biweeklyDiscountPct)} step="1" hint="For bi-weekly recurring bookings." />
          <Field name="perBedroomRands" label="Per-bedroom rate (R)" defaultValue={r(s.perBedroomCents)} hint="Added per bedroom on room-based services." />
          <Field name="perBathroomRands" label="Per-bathroom rate (R)" defaultValue={r(s.perBathroomCents)} hint="Added per bathroom on room-based services." />
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-[14px] border border-line bg-surface-lav px-4 py-3">
          <span className="text-[16px]">👀</span>
          <p className="text-[12.5px] leading-snug text-muted">
            Preview: a 3-bed / 2-bath room service adds the per-room rates on top of its base price, before any recurring discount.
          </p>
        </div>

        <button type="submit" className="btn-primary mt-6 w-full sm:w-auto">Save changes</button>
      </form>
    </div>
  );
}

function Field({ name, label, defaultValue, hint, step = "0.01" }: { name: string; label: string; defaultValue: string; hint: string; step?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">{label}</span>
      <input name={name} type="number" min="0" step={step} defaultValue={defaultValue} required className="field" />
      <span className="text-[11.5px] leading-snug text-muted">{hint}</span>
    </label>
  );
}
