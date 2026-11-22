import { createHmac, timingSafeEqual } from "node:crypto";
export function isTestSeller(value: unknown, expected: string | undefined) {
  if (!value || typeof value !== "object" || !expected) return false;
  const account = value as { id?: unknown; tags?: unknown };
  return (
    String(account.id) === expected &&
    Array.isArray(account.tags) &&
    account.tags.includes("test_user")
  );
}
export function verifyPaymentSignature({
  signature,
  requestId,
  dataId,
  secret,
  now = Date.now(),
}: {
  signature: string | null;
  requestId: string | null;
  dataId: string;
  secret: string;
  now?: number;
}) {
  if (
    !signature ||
    !requestId ||
    requestId.length > 256 ||
    signature.length > 1000 ||
    !/^\d{1,64}$/.test(dataId)
  )
    return false;
  const parts = Object.fromEntries(
    signature.split(",").map((v) => v.trim().split("=")),
  );
  if (
    !/^\d{10,13}$/.test(parts.ts || "") ||
    !/^[a-f0-9]{64}$/i.test(parts.v1 || "")
  )
    return false;
  const timestamp = Number(parts.ts) * (parts.ts.length <= 10 ? 1000 : 1);
  if (Math.abs(now - timestamp) > 15 * 60 * 1000) return false;
  const expected = createHmac("sha256", secret)
    .update(`id:${dataId};request-id:${requestId};ts:${parts.ts};`)
    .digest();
  return timingSafeEqual(expected, Buffer.from(parts.v1, "hex"));
}
export function paymentAmountCents(amount: unknown) {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0)
    throw Error("Valor de pagamento inválido.");
  const cents = Math.round(amount * 100);
  if (!Number.isSafeInteger(cents) || Math.abs(cents / 100 - amount) > 0.000001)
    throw Error("Valor de pagamento inválido.");
  return cents;
}
