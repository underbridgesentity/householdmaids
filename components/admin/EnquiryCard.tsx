import { updateEnquiryAction } from "@/app/actions/quote";

export type EnquiryCardData = {
  id: string;
  reference: string;
  serviceName: string;
  serviceEmoji: string;
  areaName: string | null;
  name: string;
  email: string;
  phone: string | null;
  details: string;
  status: "NEW" | "QUOTED" | "CLOSED";
  adminNote: string | null;
  createdAt: string;
};

const STATUS_STYLE: Record<EnquiryCardData["status"], string> = {
  NEW: "bg-surface-pink text-magenta-brand",
  QUOTED: "bg-[#e7f6ec] text-money-dark",
  CLOSED: "bg-surface-lav text-muted-label",
};

export function EnquiryCard({ enquiry }: { enquiry: EnquiryCardData }) {
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-lav text-xl">{enquiry.serviceEmoji}</div>
          <div>
            <div className="font-display text-[15.5px] font-bold">{enquiry.serviceName}</div>
            <div className="text-[12.5px] text-muted">
              {enquiry.reference} · {enquiry.createdAt}
              {enquiry.areaName ? ` · ${enquiry.areaName}` : ""}
            </div>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLE[enquiry.status]}`}>
          {enquiry.status}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1.4fr]">
        <div className="rounded-[14px] bg-surface-lav px-4 py-3 text-[13px]">
          <div className="font-bold text-ink">{enquiry.name}</div>
          <a href={`mailto:${enquiry.email}`} className="mt-0.5 block font-semibold text-magenta-brand">{enquiry.email}</a>
          {enquiry.phone && <a href={`tel:${enquiry.phone}`} className="mt-0.5 block font-semibold text-indigo-brand">{enquiry.phone}</a>}
        </div>
        <div className="rounded-[14px] border border-line px-4 py-3 text-[13.5px] leading-relaxed text-[#3f3a57]">
          {enquiry.details}
        </div>
      </div>

      {/* Status + internal note (e.g. the quoted amount) */}
      <form action={updateEnquiryAction} className="mt-4 flex flex-col gap-2.5 border-t border-line pt-4 sm:flex-row sm:items-end">
        <input type="hidden" name="id" value={enquiry.id} />
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-label">
          Status
          <select name="status" defaultValue={enquiry.status} className="field bg-white py-2 text-[13.5px]">
            <option value="NEW">New</option>
            <option value="QUOTED">Quoted</option>
            <option value="CLOSED">Closed</option>
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-[12px] font-semibold text-muted-label">
          Internal note / quoted amount
          <input name="adminNote" defaultValue={enquiry.adminNote ?? ""} placeholder="e.g. Quoted R1 850 for 40 panes" className="field bg-white py-2 text-[13.5px]" />
        </label>
        <button type="submit" className="btn-primary py-2.5 text-[13.5px]">Save</button>
      </form>
    </div>
  );
}
