import "server-only";
import { checkoutService } from "./server";
import type { Order } from "./schema";
import { isTestSeller } from "./payment-security";
export async function assertTestSeller() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (process.env.CHECKOUT_MODE !== "test" || !token)
    throw Error("Pagamento de testes não configurado.");
  const response = await fetch("https://api.mercadolibre.com/users/me", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (
    !response.ok ||
    !isTestSeller(await response.json(), process.env.MERCADO_PAGO_COLLECTOR_ID)
  )
    throw Error("É necessário um vendedor de testes confirmado pelo provedor.");
}
async function mercadoPago(path: string, options: RequestInit = {}) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (
    process.env.CHECKOUT_MODE !== "test" ||
    !/^(TEST-|APP_USR-)/.test(token || "")
  )
    throw Error("Pagamento de testes não configurado.");
  const response = await fetch("https://api.mercadopago.com" + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw Error("Não foi possível acessar o pagamento de testes.");
  return response.json();
}
export async function startTestPayment(order: Order, sessionHash: string) {
  await assertTestSeller();
  if (
    order.payment_status !== "pending" ||
    !order.reservation_active ||
    new Date(order.expires_at).getTime() <= Date.now()
  )
    throw Error("Pedido expirado ou inválido.");
  let preference;
  if (!order.preference_id) {
    const claim = await checkoutService().rpc("checkout_claim_preference", {
      p_id: order.id,
      p_session_hash: sessionHash,
    });
    if (claim.error) throw claim.error;
    if (claim.data) order = { ...order, preference_id: String(claim.data) };
    else {
      const existing = await mercadoPago(
        "/checkout/preferences/search?external_reference=" +
          encodeURIComponent(order.id),
      );
      const candidate = Array.isArray(existing.elements)
        ? existing.elements.find(
            (p: { external_reference?: string; id?: string }) =>
              p.external_reference === order.id && p.id,
          )
        : null;
      if (candidate) order = { ...order, preference_id: String(candidate.id) };
    }
  }
  if (order.preference_id)
    preference = await mercadoPago(
      "/checkout/preferences/" + encodeURIComponent(order.preference_id),
    );
  else {
    const base = process.env.CHECKOUT_BASE_URL!.replace(/\/$/, "");
    preference = await mercadoPago("/checkout/preferences", {
      method: "POST",
      headers: { "X-Idempotency-Key": order.id },
      body: JSON.stringify({
        external_reference: order.id,
        metadata: { order_id: order.id, test_mode: true },
        items: [
          ...order.items.map((item) => ({
            id: item.variant_id,
            title: `${item.product_name} · ${item.label}`.slice(0, 250),
            quantity: item.quantity,
            unit_price: item.unit_price_cents / 100,
            currency_id: "BRL",
          })),
          ...(order.shipping_cents > 0
            ? [
                {
                  id: "delivery",
                  title: "Entrega",
                  quantity: 1,
                  unit_price: order.shipping_cents / 100,
                  currency_id: "BRL",
                },
              ]
            : []),
        ],
        back_urls: {
          success: `${base}/pedido/${order.id}`,
          pending: `${base}/pedido/${order.id}`,
          failure: `${base}/pedido/${order.id}`,
        },
        notification_url: `${base}/api/payments/webhook`,
        expires: true,
        expiration_date_to: order.expires_at,
        payment_methods: { excluded_payment_types: [{ id: "ticket" }] },
        statement_descriptor: "PET PIRAJU",
      }),
    });
    const saved = await checkoutService().rpc("checkout_preference", {
      p_id: order.id,
      p_session_hash: sessionHash,
      p_preference_id: String(preference.id),
    });
    if (saved.error) throw saved.error;
  }
  if (String(preference.external_reference) !== order.id)
    throw Error("Preferência não corresponde ao pedido.");
  if (order.preference_id) {
    const saved = await checkoutService().rpc("checkout_preference", {
      p_id: order.id,
      p_session_hash: sessionHash,
      p_preference_id: String(preference.id),
    });
    if (saved.error) throw saved.error;
  }
  const url = new URL(
    preference.sandbox_init_point || preference.init_point || "",
  );
  if (
    url.protocol !== "https:" ||
    ![
      "sandbox.mercadopago.com.br",
      "sandbox.mercadopago.com",
      "www.mercadopago.com.br",
      "www.mercadopago.com",
    ].includes(url.hostname)
  )
    throw Error("URL de testes inválida. Nenhum pagamento real será iniciado.");
  return url.toString();
}
export async function fetchTestPayment(id: string) {
  await assertTestSeller();
  if (!/^\d{1,64}$/.test(id)) throw Error("Identificador inválido.");
  return mercadoPago("/v1/payments/" + id);
}
