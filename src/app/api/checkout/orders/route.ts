import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { ZodError } from "zod";
import { orderSchema, type Order } from "@/lib/checkout/schema";
import {
  checkoutReadiness,
  checkoutService,
  sessionHash,
  sameOrigin,
  readBody,
  safeCheckoutError,
} from "@/lib/checkout/server";
import {
  startTestPayment,
  assertTestSeller,
} from "@/lib/checkout/mercado-pago";
import {
  addressHash,
  freightConfig,
  nationalShippingEnabled,
} from "@/lib/checkout/national-shipping";
import { verifyFreight } from "@/lib/checkout/freight-security";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!checkoutReadiness().ready)
    return NextResponse.json(
      {
        error:
          "O pagamento de testes ainda está em configuração. Nenhum pedido foi criado.",
      },
      { status: 503 },
    );
  try {
    const data = orderSchema.parse(await readBody(request));
    await assertTestSeller();
    const hash = (await sessionHash(true))!;
    const db = checkoutService();
    const expiration = await db.rpc("checkout_expire");
    if (expiration.error) throw expiration.error;
    let shipping;
    if (nationalShippingEnabled()) {
      const config = freightConfig();
      if (!data.shipping_token)
        throw Error(
          "Cotação de frete inválida ou expirada. Consulte a entrega novamente.",
        );
      shipping = verifyFreight(data.shipping_token, config.token, {
        session: hash,
        address: addressHash(data.address),
        origin: config.origin,
      });
      const chosen = data.items.map((item) => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
      }));
      const quoted = shipping.items.map((item) => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
      }));
      if (JSON.stringify(chosen) !== JSON.stringify(quoted))
        throw Error(
          "Cotação de frete inválida ou expirada. Consulte a entrega novamente.",
        );
    }
    const created = await db.rpc(
      shipping ? "checkout_create_national" : "checkout_create",
      {
        p_session_hash: hash,
        p_idempotency: data.idempotency_key,
        p_request_hash: createHash("sha256")
          .update(JSON.stringify(data))
          .digest("hex"),
        p_customer: data.customer,
        p_address: data.address,
        p_lines: data.items,
        p_expected_total: data.expected_total_cents,
        ...(shipping ? { p_shipping: shipping } : {}),
      },
    );
    if (created.error) throw created.error;
    const orderId = String(created.data.id);
    const result = await db.rpc("checkout_get", {
      p_id: orderId,
      p_session_hash: hash,
    });
    if (result.error || !result.data) throw Error("Pedido não encontrado.");
    try {
      const redirect = await startTestPayment(result.data as Order, hash);
      return NextResponse.json(
        { orderId, redirect, testMode: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch {
      return NextResponse.json(
        {
          orderId,
          error:
            "Pedido de teste reservado, mas não foi possível abrir o provedor. Acompanhe o pedido para tentar novamente ou aguarde a liberação automática.",
        },
        { status: 502 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof ZodError
            ? "Confira os dados obrigatórios."
            : safeCheckoutError(error),
      },
      { status: error instanceof ZodError ? 400 : 422 },
    );
  }
}
