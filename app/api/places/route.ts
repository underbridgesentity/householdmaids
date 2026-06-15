import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Server-side proxy for Google Places Autocomplete. Keeps GOOGLE_MAPS_API_KEY
 * secret (never shipped to the browser) and needs no CSP changes (the browser
 * only talks to our own origin). Restricted to South African addresses.
 *
 * Returns { predictions: [{ description, placeId }] }. If no key is configured
 * it returns an empty list, so the address field gracefully stays free-text.
 */
export async function GET(request: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ predictions: [] });

  const ip = await clientIp();
  if (!(await rateLimit(`places:${ip}`, 60, 60 * 1000))) {
    return NextResponse.json({ predictions: [] }, { status: 429 });
  }

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json({ predictions: [] });

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", q);
  url.searchParams.set("components", "country:za");
  url.searchParams.set("types", "address");
  url.searchParams.set("key", key);

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = (await res.json()) as { predictions?: { description: string; place_id: string }[]; status?: string };
    const predictions = (data.predictions ?? []).slice(0, 6).map((p) => ({ description: p.description, placeId: p.place_id }));
    return NextResponse.json({ predictions });
  } catch {
    return NextResponse.json({ predictions: [] });
  }
}
