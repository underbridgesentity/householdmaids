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

  // Places API (New): POST to places:autocomplete, key via header, region-biased to ZA.
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
      body: JSON.stringify({ input: q, includedRegionCodes: ["za"] }),
      cache: "no-store",
    });
    const data = (await res.json()) as {
      suggestions?: { placePrediction?: { placeId?: string; text?: { text?: string } } }[];
      error?: { status?: string; message?: string };
    };
    if (!res.ok || data.error) {
      console.error(`[places] Google ${res.status} ${data.error?.status ?? ""} ${data.error?.message ?? ""}`);
      return NextResponse.json({ predictions: [] });
    }
    const predictions = (data.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is { placeId?: string; text?: { text?: string } } => !!p?.text?.text)
      .slice(0, 6)
      .map((p) => ({ description: p.text!.text!, placeId: p.placeId ?? "" }));
    return NextResponse.json({ predictions });
  } catch (e) {
    console.error("[places] fetch error", (e as Error).message);
    return NextResponse.json({ predictions: [] });
  }
}
