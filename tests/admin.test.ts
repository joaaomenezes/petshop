import { test } from "node:test";
import assert from "node:assert/strict";
import {
  productSchema,
  inventorySchema,
  imageExtension,
  slugify,
} from "../src/lib/admin/schema";
function product() {
  return {
    id: crypto.randomUUID(),
    updated_at: null,
    name: "Ração",
    slug: "racao",
    brand_id: crypto.randomUUID(),
    category_id: crypto.randomUUID(),
    species: "Cachorros",
    description: "",
    active: true,
    featured: false,
    images: [],
    variants: [
      {
        id: crypto.randomUUID(),
        label: "3 kg",
        sku: "SKU-01",
        barcode: "",
        price_cents: 8990,
        cost_cents: 1000,
        weight_grams: 3000,
        stock_quantity: 3,
        min_stock_quantity: 5,
        active: true,
      },
    ],
  };
}
test("validação aceita cadastro e edição, rejeita negativos e SKUs repetidos", () => {
  const p = product();
  assert.equal(productSchema.parse(p).variants[0].price_cents, 8990);
  assert.equal(
    productSchema.parse({
      ...p,
      updated_at: "2026-11-22T10:00:00Z",
      name: "Nome atualizado",
    }).name,
    "Nome atualizado",
  );
  assert.equal(
    productSchema.safeParse({
      ...p,
      variants: [{ ...p.variants[0], stock_quantity: -1 }],
    }).success,
    false,
  );
  assert.equal(
    productSchema.safeParse({
      ...p,
      variants: [
        ...p.variants,
        { ...p.variants[0], id: crypto.randomUUID(), sku: "sku-01" },
      ],
    }).success,
    false,
  );
  assert.equal(productSchema.safeParse({ ...p, variants: [] }).success, false);
});
test("movimentação requer quantidade inteira positiva e justificativa", () => {
  assert.equal(
    inventorySchema.safeParse({
      variant_id: crypto.randomUUID(),
      type: "saida",
      quantity: 0.5,
      reason: "Ajuste",
    }).success,
    false,
  );
  assert.equal(
    inventorySchema.safeParse({
      variant_id: crypto.randomUUID(),
      type: "entrada",
      quantity: 1,
      reason: "",
    }).success,
    false,
  );
});
test("upload verifica assinatura real e recusa SVG ou arquivo disfarçado", () => {
  assert.equal(
    imageExtension(new Uint8Array([255, 216, 255, 0]), "image/jpeg"),
    "jpg",
  );
  assert.throws(() =>
    imageExtension(new Uint8Array([60, 115, 118, 103]), "image/jpeg"),
  );
  assert.throws(() =>
    imageExtension(new Uint8Array([60, 115, 118, 103]), "image/svg+xml"),
  );
  assert.equal(slugify("Ração Natural 3 kg"), "racao-natural-3-kg");
});
