import { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, ChevronUp, ChevronDown, Search, Download } from "lucide-react";
import { buildHref, type SortDir } from "@/lib/admin-table";

export type Column<T> = {
  key: string;
  header: string;
  sortKey?: string; // value for the ?sort= param when this column is sortable
  align?: "left" | "right" | "center";
  className?: string;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns, rows, total, page, pageSize, basePath, sp, sort, dir,
  rowKey, rowHref, searchPlaceholder = "Search…", exportHref, toolbar, emptyLabel = "Nothing here yet.",
}: {
  columns: Column<T>[];
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  basePath: string;
  sp: Record<string, string | undefined>;
  sort?: string;
  dir: SortDir;
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  searchPlaceholder?: string;
  exportHref?: string;
  toolbar?: ReactNode;
  emptyLabel?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const align = (a?: string) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");

  // Hidden inputs so the search GET form preserves active filters (not q/page).
  const preserved = Object.entries(sp).filter(([k, v]) => v && k !== "q" && k !== "page");

  return (
    <div className="flex flex-col gap-3.5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form action={basePath} method="get" className="relative">
          {preserved.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <Search size={15} strokeWidth={2.2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-faint" />
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder={searchPlaceholder}
            className="h-10 w-[230px] max-w-full rounded-[11px] border border-line-input bg-white pl-9 pr-3 text-[13.5px] outline-none transition focus:border-magenta-brand focus:ring-2 focus:ring-magenta-brand/15"
          />
        </form>
        <div className="flex items-center gap-2.5">
          {toolbar}
          {exportHref && (
            <Link href={exportHref} className="inline-flex items-center gap-2 rounded-[11px] border border-line-input bg-white px-3.5 py-2.5 text-[13px] font-bold text-indigo-brand transition hover:bg-surface-lav">
              <Download size={15} strokeWidth={2.2} /> Export
            </Link>
          )}
        </div>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-[16px] border border-line bg-white shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.22)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-[#faf8fc]">
                {columns.map((col) => {
                  const isSorted = sort && col.sortKey === sort;
                  const nextDir: SortDir = isSorted && dir === "asc" ? "desc" : "asc";
                  return (
                    <th key={col.key} className={`px-4 py-3 text-[11px] font-bold uppercase tracking-[.05em] text-muted-label ${align(col.align)} ${col.className ?? ""}`}>
                      {col.sortKey ? (
                        <Link href={buildHref(basePath, sp, { sort: col.sortKey, dir: nextDir, page: undefined })} className="inline-flex items-center gap-1 transition hover:text-indigo-brand">
                          {col.header}
                          {isSorted ? (dir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : <ChevronDown size={13} className="opacity-25" />}
                        </Link>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
                {rowHref && <th className="w-10 px-2" />}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={columns.length + (rowHref ? 1 : 0)} className="px-4 py-14 text-center text-[13.5px] text-muted">{emptyLabel}</td></tr>
              )}
              {rows.map((row) => (
                <tr key={rowKey(row)} className="group border-b border-[#f3eff8] transition last:border-0 hover:bg-[#fbf9fd]">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 align-middle ${align(col.align)} ${col.className ?? ""}`}>{col.render(row)}</td>
                  ))}
                  {rowHref && (
                    <td className="w-10 px-2 text-right">
                      <Link href={rowHref(row)} aria-label="View details" className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-faint transition group-hover:bg-surface-lav group-hover:text-magenta-brand">
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer / pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-[#faf8fc] px-4 py-3 text-[12.5px]">
          <span className="font-semibold text-muted">{total === 0 ? "No results" : `${from}–${to} of ${total.toLocaleString()}`}</span>
          {pages > 1 && (
            <div className="flex items-center gap-1.5">
              <PageLink basePath={basePath} sp={sp} page={page - 1} disabled={page <= 1} label="Prev" />
              <span className="px-1 font-semibold text-muted-label">Page {page} of {pages}</span>
              <PageLink basePath={basePath} sp={sp} page={page + 1} disabled={page >= pages} label="Next" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PageLink({ basePath, sp, page, disabled, label }: { basePath: string; sp: Record<string, string | undefined>; page: number; disabled: boolean; label: string }) {
  if (disabled) {
    return <span className="rounded-lg border border-line-input bg-white px-3 py-1.5 font-bold text-muted-faint opacity-50">{label}</span>;
  }
  return (
    <Link href={buildHref(basePath, sp, { page })} className="rounded-lg border border-line-input bg-white px-3 py-1.5 font-bold text-indigo-brand transition hover:bg-surface-lav">{label}</Link>
  );
}
