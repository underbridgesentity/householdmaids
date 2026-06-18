"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  addHelperAction, importHelpersAction,
  type AddHelperState, type ImportHelpersState,
} from "@/app/actions/admin";

type Area = { id: string; name: string };

export function HelperManager({ areas }: { areas: Area[] }) {
  const [tab, setTab] = useState<"single" | "import">("single");

  return (
    <div className="card p-5">
      <div className="mb-5 flex gap-2">
        {(["single", "import"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-[13px] font-bold transition ${tab === t ? "bg-brand-gradient text-white" : "bg-surface-lav text-[#5f5878]"}`}
          >
            {t === "single" ? "Add a helper" : "Bulk import (CSV)"}
          </button>
        ))}
      </div>
      {tab === "single" ? <SingleForm areas={areas} /> : <ImportForm />}
    </div>
  );
}

function SingleForm({ areas }: { areas: Area[] }) {
  const [state, action, pending] = useActionState<AddHelperState, FormData>(addHelperAction, undefined);
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const toggle = (id: string) => setAreaIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  if (state?.created) {
    return (
      <div className="rounded-2xl border border-[#cfe8d8] bg-[#eef6f0] p-5">
        <div className="font-display font-bold text-money-dark">✓ Helper created</div>
        <p className="mt-1 text-[13px] text-money-dark/80">Share these sign-in details. They can change the password after first login.</p>
        <div className="mt-3 flex flex-col gap-1 rounded-xl bg-white p-3 font-mono text-[13px]">
          <div><span className="text-muted">Email:</span> {state.created.email}</div>
          <div><span className="text-muted">Temp password:</span> <strong>{state.created.tempPassword}</strong></div>
        </div>
        <Link href="/admin/helpers/new" className="mt-4 inline-block text-[13px] font-bold text-magenta-brand">Add another →</Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      {state?.error && (
        <div className="rounded-xl border border-[#f0d6d6] bg-[#fdf3f3] px-4 py-3 text-sm font-semibold text-[#d05656]">{state.error}</div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1"><span className="label">Full name</span><input name="fullName" required className="field py-2.5" /></label>
        <label className="flex flex-col gap-1"><span className="label">Email</span><input name="email" type="email" required className="field py-2.5" /></label>
        <label className="flex flex-col gap-1"><span className="label">Phone</span><input name="phone" type="tel" className="field py-2.5" /></label>
        <label className="flex flex-col gap-1"><span className="label">Years experience</span><input name="yearsExperience" type="number" min="0" defaultValue="0" className="field py-2.5" /></label>
      </div>
      <div>
        <span className="label">Areas they work</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {areas.map((a) => {
            const sel = areaIds.includes(a.id);
            return (
              <button type="button" key={a.id} onClick={() => toggle(a.id)} className={`rounded-full border-[1.5px] px-3 py-1.5 text-[12.5px] font-bold ${sel ? "border-magenta-brand bg-surface-pink text-magenta-brand" : "border-line-input bg-white text-[#5f5878]"}`}>{a.name}</button>
            );
          })}
        </div>
        {areaIds.map((id) => <input key={id} type="hidden" name="areaIds" value={id} />)}
      </div>
      <label className="flex items-center gap-2.5 text-[13.5px] font-semibold text-ink">
        <input type="checkbox" name="approved" value="true" defaultChecked className="h-4 w-4 accent-magenta-brand" />
        Mark as approved (vetted) immediately
      </label>
      <button type="submit" disabled={pending} className="btn-primary mt-1 w-full sm:w-auto sm:px-8">{pending ? "Creating…" : "Create helper"}</button>
    </form>
  );
}

function ImportForm() {
  const [state, action, pending] = useActionState<ImportHelpersState, FormData>(importHelpersAction, undefined);
  const created = state?.results?.filter((r) => r.tempPassword) ?? [];
  const failed = state?.results?.filter((r) => r.error) ?? [];

  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-[13px] text-muted-soft">
        Paste one helper per line as <code className="rounded bg-surface-lav px-1.5 py-0.5 text-[12px]">Full name, email, phone, years, areas</code>{" "}
        (areas separated by <code className="rounded bg-surface-lav px-1.5 py-0.5 text-[12px]">;</code>). A header row is optional. Imported helpers are marked approved.
      </p>
      <textarea
        name="csv"
        required
        rows={7}
        placeholder={"Nomsa Dlamini, nomsa@email.co.za, 082 000 0000, 5, Sandton;Midrand\nGrace Khumalo, grace@email.co.za, 083 111 2222, 3, Soweto"}
        className="field font-mono text-[13px]"
      />
      {state?.error && <div className="rounded-xl border border-[#f0d6d6] bg-[#fdf3f3] px-4 py-3 text-sm font-semibold text-[#d05656]">{state.error}</div>}
      <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto sm:px-8">{pending ? "Importing…" : "Import helpers"}</button>

      {state?.results && (
        <div className="mt-2 flex flex-col gap-3">
          <div className="text-[13px] font-bold text-money-dark">✓ {created.length} created{failed.length ? ` · ${failed.length} skipped` : ""}</div>
          {created.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-line">
              <div className="grid grid-cols-2 bg-surface-lav px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                <span>Email</span><span>Temp password</span>
              </div>
              {created.map((r) => (
                <div key={r.email} className="grid grid-cols-2 border-t border-line px-3 py-2 font-mono text-[12.5px]">
                  <span className="truncate">{r.email}</span><strong>{r.tempPassword}</strong>
                </div>
              ))}
            </div>
          )}
          {failed.length > 0 && (
            <div className="rounded-xl border border-[#f0d6d6] bg-[#fdf3f3] p-3 text-[12.5px] text-[#d05656]">
              {failed.map((r) => <div key={r.email}>{r.email}: {r.error}</div>)}
            </div>
          )}
          <p className="text-[12px] text-muted-faint">Copy these temp passwords now to share with your team. They can change them after first sign-in.</p>
        </div>
      )}
    </form>
  );
}
