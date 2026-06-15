import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/rbac";
import { csvSafe } from "@/lib/payout";

/** Streams the signed-in user's wallet statement as CSV. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const txns = await prisma.walletTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  const header = "Date,Type,Description,Amount(ZAR),Status,BalanceAfter(ZAR)";
  const rows = txns.map((t) =>
    [
      new Date(t.createdAt).toISOString().slice(0, 10),
      t.type,
      t.ref ?? "",
      (t.amountCents / 100).toFixed(2),
      t.status,
      (t.balanceAfter / 100).toFixed(2),
    ].map(csvSafe).join(","),
  );
  const csv = [header, ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="household-maids-statement.csv"`,
    },
  });
}
