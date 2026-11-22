import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { checkoutService } from "@/lib/checkout/server";
export async function POST(request: Request) {
  const secret = process.env.CHECKOUT_CRON_SECRET;
  const provided = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret || ""}`;
  if (
    !secret ||
    secret.length < 32 ||
    provided.length !== expected.length ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  )
    return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  try {
    const result = await checkoutService().rpc("checkout_expire");
    if (result.error) throw result.error;
    return NextResponse.json(
      { released: result.data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Não foi possível liberar reservas." },
      { status: 503 },
    );
  }
}
