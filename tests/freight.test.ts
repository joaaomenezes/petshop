import { test } from "node:test";
import assert from "node:assert/strict";
import {
  signFreight,
  verifyFreight,
  decimalCents,
  type FreightPayload,
} from "../src/lib/checkout/freight-security";
test("cotação assinada fica vinculada a sessão, endereço, origem e validade", () => {
  const now = Date.now();
  const secret = "credencial-ficticia-de-teste";
  const payload: FreightPayload = {
    provider: "melhor_envio",
    session_hash: "a".repeat(64),
    address_hash: "b".repeat(64),
    origin: "18800332",
    destination: "01018020",
    expires_at: new Date(now + 600000).toISOString(),
    service_id: "1",
    service_name: "PAC",
    carrier: "Correios",
    price_cents: 1590,
    delivery_estimate: "5 dias úteis",
    items: [{ variant_id: crypto.randomUUID(), quantity: 1 }],
    packages: [],
  };
  const binding = {
    session: payload.session_hash,
    address: payload.address_hash,
    origin: payload.origin,
  };
  const token = signFreight(payload, secret);
  assert.equal(verifyFreight(token, secret, binding, now).price_cents, 1590);
  const encoded = Buffer.from(
    JSON.stringify({ ...payload, price_cents: 1 }),
  ).toString("base64url");
  assert.throws(() =>
    verifyFreight(encoded + "." + token.split(".")[1], secret, binding, now),
  );
  assert.throws(() =>
    verifyFreight(token, secret, { ...binding, session: "c".repeat(64) }, now),
  );
  assert.throws(() =>
    verifyFreight(token, secret, { ...binding, address: "d".repeat(64) }, now),
  );
  assert.throws(() =>
    verifyFreight(token, secret, { ...binding, origin: "01018020" }, now),
  );
  assert.throws(() => verifyFreight(token, "outro-segredo", binding, now));
  assert.throws(() => verifyFreight(token, secret, binding, now + 600001));
});
test("valor de frete aceita apenas centavos válidos sem arredondar milésimos", () => {
  assert.equal(decimalCents("15.90"), 1590);
  assert.equal(decimalCents(0), 0);
  for (const value of [
    "15.901",
    -1,
    "",
    null,
    undefined,
    "NaN",
    "Infinity",
    "1e10",
    10000000,
  ])
    assert.equal(decimalCents(value), null);
});
