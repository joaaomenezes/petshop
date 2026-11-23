import "server-only";
import { createHash } from "node:crypto";
import {
  signFreight,
  decimalCents,
  freightPayloadSchema,
} from "./freight-security";
import { publicCheckoutClient } from "./server";
import type { Quote } from "./schema";
export const addressHash = (address: unknown) =>
  createHash("sha256").update(JSON.stringify(address)).digest("hex");
export const nationalShippingEnabled = () =>
  !!process.env.MELHOR_ENVIO_TOKEN?.trim();
export function freightConfig() {
  const token = process.env.MELHOR_ENVIO_TOKEN?.trim();
  const origin = process.env.MELHOR_ENVIO_ORIGIN_POSTAL_CODE;
  const environment = process.env.MELHOR_ENVIO_ENVIRONMENT || "production";
  const contact = process.env.MELHOR_ENVIO_CONTACT_EMAIL;
  if (
    !token ||
    !/^\d{8}$/.test(origin || "") ||
    !contact ||
    !["production", "sandbox"].includes(environment)
  )
    throw Error("Frete nacional ainda não configurado.");
  return {
    token,
    origin: origin!,
    contact,
    base:
      environment === "sandbox"
        ? "https://sandbox.melhorenvio.com.br"
        : "https://melhorenvio.com.br",
  };
}
// Per-process protection; replace with distributed limits before production launch.
const attempts = new Map<string, { at: number; count: number }>();
export function allowFreightAttempt(hash: string) {
  const now = Date.now();
  const entry = attempts.get(hash);
  if (entry && now - entry.at < 60000) {
    if (entry.count >= 6) return false;
    entry.count++;
    return true;
  }
  if (attempts.size >= 2000) attempts.delete(attempts.keys().next().value!);
  attempts.set(hash, { at: now, count: 1 });
  return true;
}
export async function quoteNational(
  items: { variant_id: string; quantity: number }[],
  address: { postal_code: string },
  session: string,
) {
  const config = freightConfig();
  const db = publicCheckoutClient();
  if (!db) throw Error("Frete nacional ainda não configurado.");
  const result = await db.rpc("checkout_shipping_cart", { p_lines: items });
  if (result.error) {
    if (result.error.code === "PGRST202")
      throw Error("Frete nacional em preparação. Tente novamente mais tarde.");
    throw result.error;
  }
  const cart = result.data as Quote;
  const response = await fetch(config.base + "/api/v2/me/shipment/calculate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": `Pet Piraju (${config.contact})`,
    },
    body: JSON.stringify({
      from: { postal_code: config.origin },
      to: { postal_code: address.postal_code },
      products: cart.items.map((item) => {
        const measure = item as typeof item & {
          shipping_weight_grams: number;
          package_width_cm: number;
          package_height_cm: number;
          package_length_cm: number;
        };
        return {
          id: item.variant_id,
          width: measure.package_width_cm,
          height: measure.package_height_cm,
          length: measure.package_length_cm,
          weight: measure.shipping_weight_grams / 1000,
          insurance_value: item.unit_price_cents / 100,
          quantity: item.quantity,
        };
      }),
      options: { receipt: false, own_hand: false },
    }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw Error(
      "Não foi possível consultar as transportadoras. Tente novamente.",
    );
  const rates: unknown = await response.json();
  if (!Array.isArray(rates))
    throw Error(
      "Não foi possível consultar as transportadoras. Tente novamente.",
    );
  const expires = new Date(Date.now() + 10 * 60000).toISOString();
  const quotes: Quote[] = [];
  for (const raw of rates.slice(0, 100)) {
    if (!raw || typeof raw !== "object" || raw.error) continue;
    const price = decimalCents(raw.custom_price ?? raw.price);
    const days = raw.custom_delivery_time ?? raw.delivery_time;
    if (
      price === null ||
      !Number.isInteger(Number(days)) ||
      Number(days) < 1 ||
      Number(days) > 365 ||
      !raw.id ||
      typeof raw.name !== "string"
    )
      continue;
    const carrier = String(raw.company?.name || "").slice(0, 150);
    const estimate = `${carrier} · ${raw.name} — estimativa de ${Number(days)} dias úteis após a postagem`;
    const payload = freightPayloadSchema.safeParse({
      provider: "melhor_envio",
      session_hash: session,
      address_hash: addressHash(address),
      origin: config.origin,
      destination: address.postal_code,
      expires_at: expires,
      service_id: String(raw.id),
      service_name: raw.name,
      carrier,
      price_cents: price,
      delivery_estimate: estimate,
      items: cart.items,
      packages: raw.packages || [],
    });
    if (!payload.success) continue;
    const token = signFreight(payload.data, config.token);
    if (token.length > 100000) continue;
    quotes.push({
      ...cart,
      shipping_cents: price,
      total_cents: cart.subtotal_cents + price,
      delivery_estimate: estimate,
      shipping_token: token,
      shipping_service: `${carrier} · ${raw.name}`,
      shipping_expires_at: expires,
    });
  }
  if (!quotes.length)
    throw Error(
      "Nenhuma entrega disponível para este CEP e estes produtos. Confira os dados ou fale com a loja.",
    );
  return quotes.sort((a, b) => a.shipping_cents - b.shipping_cents);
}
