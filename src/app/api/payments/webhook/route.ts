import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  verifyPaymentSignature,
  paymentAmountCents,
} from "@/lib/checkout/payment-security";
import { fetchTestPayment } from "@/lib/checkout/mercado-pago";
import { checkoutService } from "@/lib/checkout/server";
const paymentSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  external_reference: z.uuid(),
  collector_id: z.union([z.number(), z.string()]).transform(String),
  live_mode: z.literal(false),
  currency_id: z.literal("BRL"),
  transaction_amount: z.number().nonnegative(),
  status: z.enum([
    "pending",
    "approved",
    "authorized",
    "in_process",
    "in_mediation",
    "rejected",
    "cancelled",
    "refunded",
    "charged_back",
  ]),
  date_last_updated: z.string(),
});
export async function POST(request: Request) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (process.env.CHECKOUT_MODE !== "test" || !secret)
    return NextResponse.json(
      { error: "Notificações não configuradas." },
      { status: 503 },
    );
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("data.id") || "";
    if (
      url.searchParams.getAll("data.id").length !== 1 ||
      !verifyPaymentSignature({
        signature: request.headers.get("x-signature"),
        requestId: request.headers.get("x-request-id"),
        dataId: id,
        secret,
      })
    )
      return NextResponse.json(
        { error: "Assinatura inválida." },
        { status: 401 },
      );
    const body = await request.text();
    if (body.length > 20000)
      return NextResponse.json(
        { error: "Notificação inválida." },
        { status: 413 },
      );
    const event = JSON.parse(body);
    if (event.type !== "payment")
      return NextResponse.json({ received: true, ignored: true });
    if (String(event.data?.id) !== id)
      return NextResponse.json(
        { error: "Identificador inválido." },
        { status: 400 },
      );
    const payment = paymentSchema.parse(await fetchTestPayment(id));
    if (
      payment.id !== id ||
      payment.collector_id !== process.env.MERCADO_PAGO_COLLECTOR_ID
    )
      return NextResponse.json(
        { error: "Pagamento não corresponde à integração." },
        { status: 422 },
      );
    const result = await checkoutService().rpc("checkout_payment", {
      p_order_id: payment.external_reference,
      p_payment_id: id,
      p_event_key: createHash("sha256")
        .update(`${id}:${payment.status}:${payment.date_last_updated}`)
        .digest("hex"),
      p_status: payment.status,
      p_amount_cents: paymentAmountCents(payment.transaction_amount),
      p_currency: payment.currency_id,
      p_live_mode: payment.live_mode,
    });
    if (result.error)
      return NextResponse.json(
        { error: "Não foi possível registrar a notificação." },
        { status: 503 },
      );
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Não foi possível validar a notificação." },
      {
        status:
          error instanceof z.ZodError || error instanceof SyntaxError
            ? 400
            : 503,
      },
    );
  }
}
