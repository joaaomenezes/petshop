import { NextResponse } from "next/server";
import { z } from "zod";
import {
  checkoutService,
  sessionHash,
  checkoutReadiness,
  sameOrigin,
} from "@/lib/checkout/server";
import { startTestPayment } from "@/lib/checkout/mercado-pago";
import type { Order } from "@/lib/checkout/schema";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return NextResponse.json(
      { error: "Pedido não encontrado." },
      { status: 404 },
    );
  const hash = await sessionHash();
  if (!hash)
    return NextResponse.json(
      { error: "Pedido não encontrado." },
      { status: 404 },
    );
  try {
    const db = checkoutService();
    await db.rpc("checkout_expire", { p_order_id: id });
    const result = await db.rpc("checkout_get", {
      p_id: id,
      p_session_hash: hash,
    });
    if (result.error || !result.data)
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    return NextResponse.json(
      { order: result.data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Não foi possível consultar o pedido." },
      { status: 503 },
    );
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return NextResponse.json(
      { error: "Pedido não encontrado." },
      { status: 404 },
    );
  const hash = await sessionHash();
  if (!hash)
    return NextResponse.json(
      { error: "Pedido não encontrado." },
      { status: 404 },
    );
  if (!checkoutReadiness().ready)
    return NextResponse.json(
      { error: "Pagamento indisponível." },
      { status: 503 },
    );
  try {
    const db = checkoutService();
    await db.rpc("checkout_expire", { p_order_id: id });
    const result = await db.rpc("checkout_get", {
      p_id: id,
      p_session_hash: hash,
    });
    if (result.error || !result.data)
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    return NextResponse.json({
      redirect: await startTestPayment(result.data as Order, hash),
      testMode: true,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Não foi possível abrir o pagamento. Verifique o prazo do pedido.",
      },
      { status: 422 },
    );
  }
}
