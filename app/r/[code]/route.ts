import { NextResponse } from "next/server";

/**
 * Public referral short-link. Each user's link is householdmaids.co.za/r/{CODE},
 * which lands a friend on signup with the referral code pre-filled. The reward is
 * still only earned once that friend's first booking is paid.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = (code ?? "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 32);
  const url = new URL("/book", req.url);
  if (clean) url.searchParams.set("ref", clean.toUpperCase());
  return NextResponse.redirect(url);
}
