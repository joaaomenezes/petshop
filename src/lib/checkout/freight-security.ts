import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
export const freightPayloadSchema = z.object({
  provider: z.literal("melhor_envio"),
  session_hash: z.string().length(64),
  address_hash: z.string().length(64),
  origin: z.string().regex(/^\d{8}$/),
  destination: z.string().regex(/^\d{8}$/),
  expires_at: z.iso.datetime(),
  service_id: z.string().min(1).max(80),
  service_name: z.string().min(1).max(150),
  carrier: z.string().max(150),
  price_cents: z.number().int().min(0).max(999999999),
  delivery_estimate: z.string().min(1).max(250),
  items: z.array(z.record(z.string(), z.unknown())).min(1).max(50),
  packages: z.array(z.unknown()).max(100),
});
export type FreightPayload = z.infer<typeof freightPayloadSchema>;
export function signFreight(payload: FreightPayload, secret: string) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return (
    encoded +
    "." +
    createHmac("sha256", secret)
      .update("pet-freight-v1:" + encoded)
      .digest("hex")
  );
}
export function verifyFreight(
  token: string,
  secret: string,
  binding: { session: string; address: string; origin: string },
  now = Date.now(),
) {
  if (!secret || token.length > 100000)
    throw Error("Cotação de frete inválida ou expirada.");
  const [encoded, signature, ...rest] = token.split(".");
  if (!encoded || !/^[a-f0-9]{64}$/.test(signature || "") || rest.length)
    throw Error("Cotação de frete inválida ou expirada.");
  const expected = createHmac("sha256", secret)
    .update("pet-freight-v1:" + encoded)
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex")))
    throw Error("Cotação de frete inválida ou expirada.");
  const result = freightPayloadSchema.safeParse(
    JSON.parse(Buffer.from(encoded, "base64url").toString()),
  );
  if (
    !result.success ||
    result.data.session_hash !== binding.session ||
    result.data.address_hash !== binding.address ||
    result.data.origin !== binding.origin ||
    Date.parse(result.data.expires_at) <= now
  )
    throw Error(
      "Cotação de frete inválida ou expirada. Consulte a entrega novamente.",
    );
  return result.data;
}
export function decimalCents(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(String(value))) return null;
  const result = Math.round(Number(value) * 100);
  return Number.isSafeInteger(result) && result <= 999999999 ? result : null;
}
