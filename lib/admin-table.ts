/** Server-side helpers for paginated/searchable/sortable admin tables. */

export type SortDir = "asc" | "desc";
export type TableParams = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  q: string;
  sort?: string;
  dir: SortDir;
};

export function parseTableParams(
  sp: Record<string, string | undefined>,
  opts: { defaultSort?: string; defaultDir?: SortDir; pageSize?: number } = {},
): TableParams {
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const pageSize = opts.pageSize ?? 25;
  const q = (sp.q ?? "").trim();
  const sort = sp.sort ?? opts.defaultSort;
  const dir: SortDir = sp.dir === "asc" ? "asc" : sp.dir === "desc" ? "desc" : opts.defaultDir ?? "desc";
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize, q, sort, dir };
}

/** Builds a URL preserving current params with overrides (drop a key with ""). */
export function buildHref(
  basePath: string,
  sp: Record<string, string | undefined>,
  overrides: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();
  const merged: Record<string, string | number | undefined> = { ...sp, ...overrides };
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
