import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  verifyPaymentSignature,
  paymentAmountCents,
  isTestSeller,
} from "../src/lib/checkout/payment-security";
import {
  customerSchema,
  addressSchema,
  orderSchema,
  shippingSchema,
} from "../src/lib/checkout/schema";
test("pagamento exige vendedor de testes e identificador confirmado", () => {
  assert.equal(isTestSeller({ id: 123, tags: ["test_user"] }, "123"), true);
  assert.equal(isTestSeller({ id: 123, tags: [] }, "123"), false);
  assert.equal(isTestSeller({ id: 123, tags: ["test_user"] }, "456"), false);
  assert.equal(isTestSeller(null, "123"), false);
});
test("assinatura de webhook valida HMAC, id, tempo e rejeita adulteração", () => {
  const secret = "segredo-de-teste-apenas";
  const now = Date.now();
  const ts = String(Math.floor(now / 1000));
  const id = "12345",
    requestId = "request-test";
  const signature =
    "ts=" +
    ts +
    ",v1=" +
    createHmac("sha256", secret)
      .update(`id:${id};request-id:${requestId};ts:${ts};`)
      .digest("hex");
  assert.equal(
    verifyPaymentSignature({ signature, requestId, dataId: id, secret, now }),
    true,
  );
  assert.equal(
    verifyPaymentSignature({
      signature,
      requestId,
      dataId: "999",
      secret,
      now,
    }),
    false,
  );
  assert.equal(
    verifyPaymentSignature({
      signature,
      requestId,
      dataId: id,
      secret,
      now: now + 3600000,
    }),
    false,
  );
  assert.equal(
    verifyPaymentSignature({
      signature: null,
      requestId,
      dataId: id,
      secret,
      now,
    }),
    false,
  );
  assert.equal(paymentAmountCents(89.9), 8990);
  assert.throws(() => paymentAmountCents(1.234));
});
test("checkout normaliza identificação e endereço sem aceitar preço do navegador", () => {
  const customer = customerSchema.parse({
    name: "Pessoa de Teste",
    email: "TESTE@example.invalid",
    phone: "(14) 99999-9999",
  });
  assert.equal(customer.phone, "14999999999");
  assert.equal(customer.email, "teste@example.invalid");
  const address = addressSchema.parse({
    postal_code: "18800-000",
    street: "Rua de Teste",
    number: "1",
    complement: "",
    neighborhood: "Bairro de Teste",
    city: "Piraju",
    state: "SP",
  });
  assert.equal(address.postal_code, "18800000");
  assert.equal(
    orderSchema.safeParse({
      customer,
      address,
      idempotency_key: crypto.randomUUID(),
      items: [{ variant_id: crypto.randomUUID(), quantity: 1, price: 1 }],
    }).success,
    false,
  );
  assert.equal(
    shippingSchema.safeParse({
      checkout_enabled: true,
      city: "Piraju",
      state: "SP",
      fee_cents: null,
      delivery_estimate: "",
      postal_ranges: [],
    }).success,
    false,
  );
});
