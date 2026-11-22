import { test } from "node:test";
import assert from "node:assert/strict";
import { filterProducts } from "../src/lib/catalog";
import { cartTotal, readCart, sanitizeCart, cartKey } from "../src/lib/cart";
import { products } from "../src/data/products";
test("carrinho e filtros usam catálogo injetado sem preços demonstrativos", () => {
  const id = crypto.randomUUID(),
    variantId = crypto.randomUUID();
  const catalog = [
    {
      ...products[0],
      id,
      name: "Produto do banco",
      brand: "Marca real cadastrada",
      variants: [
        { ...products[0].variants[0], id: variantId, price: 12345, stock: 2 },
      ],
    },
  ];
  const lines = sanitizeCart(
    [
      { productId: id, variantId, quantity: 99 },
      { productId: "p1", variantId: "base", quantity: 1 },
    ],
    catalog,
  );
  assert.deepEqual(lines, [{ productId: id, variantId, quantity: 2 }]);
  assert.equal(cartTotal(lines, catalog), 24690);
  assert.equal(
    filterProducts(new URLSearchParams("q=Marca real"), catalog).length,
    1,
  );
});
test("busca ignora acentos e procura marcas", () => {
  assert.ok(filterProducts(new URLSearchParams("q=racao")).length >= 4);
  assert.ok(
    filterProducts(new URLSearchParams("q=Raíza")).every(
      (p) => p.brand === "Raíza",
    ),
  );
  assert.equal(filterProducts(new URLSearchParams("q=inexistente")).length, 0);
});
test("combina filtros e ordena por preço", () => {
  const result = filterProducts(
    new URLSearchParams(
      "especie=Gatos&categoria=Rações&marca=Raíza&max=70&ordem=menor",
    ),
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "p2");
  const prices = filterProducts(new URLSearchParams("ordem=menor")).map(
    (p) => p.variants[0].price,
  );
  assert.deepEqual(
    prices,
    [...prices].sort((a, b) => a - b),
  );
});
test("variantes alteram preço e possuem estoque independente", () => {
  const p = products[0];
  assert.notEqual(p.variants[0].price, p.variants[1].price);
  const lines = sanitizeCart([
    { productId: p.id, variantId: "large", quantity: 20 },
  ]);
  assert.equal(lines[0].quantity, 5);
  assert.equal(cartTotal(lines), p.variants[1].price * 5);
});
test("carrinho soma centavos e limita estoque acumulado", () => {
  const lines = sanitizeCart([
    { productId: "p1", variantId: "base", quantity: 8 },
    { productId: "p1", variantId: "base", quantity: 8 },
    { productId: "p2", variantId: "base", quantity: 2 },
  ]);
  assert.equal(lines[0].quantity, 12);
  assert.equal(cartTotal(lines), 8990 * 12 + 6490 * 2);
});
test("rejeita indisponíveis, inválidos e quantidades fracionárias", () => {
  assert.deepEqual(
    sanitizeCart([
      { productId: "p18", variantId: "base", quantity: 1 },
      { productId: "p1", variantId: "bad", quantity: 1 },
      { productId: "p1", variantId: "base", quantity: 0.5 },
    ]),
    [],
  );
});
test("persistência restaura dados válidos e tolera corrupção ou bloqueio", () => {
  const lines = [{ productId: "p1", variantId: "large", quantity: 2 }];
  const memory = new Map([[cartKey, JSON.stringify(lines)]]);
  assert.deepEqual(
    readCart({ getItem: (key) => memory.get(key) || null }),
    lines,
  );
  assert.deepEqual(readCart({ getItem: () => "{broken" }), []);
  assert.deepEqual(
    readCart({
      getItem: () => {
        throw Error("blocked");
      },
    }),
    [],
  );
});
