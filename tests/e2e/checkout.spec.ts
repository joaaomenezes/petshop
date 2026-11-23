import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  test(`checkout visitante responsivo em ${width}px sem pedido ou cobrança`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    const mutations: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().endsWith("/api/checkout/orders")
      )
        mutations.push(request.url());
    });
    await page.goto("/produtos");
    const card = page
      .locator(".product-card:visible")
      .filter({ has: page.locator(".card-add:not(:disabled)") })
      .first();
    await expect(card).toBeVisible();
    await card.locator(".card-add").click();
    await page.goto("/carrinho");
    await page.getByRole("link", { name: "Continuar para compra" }).click();
    await expect(
      page.getByRole("heading", { name: "Seus dados", exact: true }),
    ).toBeVisible();
    const fields = await page
      .locator(".checkout-form input:visible")
      .evaluateAll((inputs) =>
        inputs.map((input) => parseFloat(getComputedStyle(input).fontSize)),
      );
    expect(fields.length).toBeGreaterThan(0);
    expect(fields.every((size) => size >= 16)).toBe(true);
    for (const [name, value] of [
      ["Nome completo", "Pessoa de Teste"],
      ["E-mail", "checkout@example.invalid"],
      ["Telefone com DDD", "(14) 99999-9999"],
    ])
      await page.getByLabel(name, { exact: true }).fill(value);
    await page.getByRole("button", { name: "Continuar para entrega" }).click();
    await expect(
      page.getByRole("heading", { name: "Onde vamos entregar?", exact: true }),
    ).toBeVisible();
    for (const [name, value] of [
      ["CEP", "18800-000"],
      ["Rua ou avenida", "Rua de Teste"],
      ["Número", "1"],
      ["Bairro", "Bairro de Teste"],
      ["Cidade", "Piraju"],
      ["UF", "SP"],
    ])
      await page.getByLabel(name, { exact: true }).fill(value);
    await page
      .getByRole("button", { name: "Consultar entrega e revisar" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Confira seu pedido", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Compra indisponível" }),
    ).toBeDisabled();
    await expect(
      page.getByText("Pessoa de Teste", { exact: false }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("checkout@example.invalid", { exact: false }).first(),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await expect(page.getByRole("radio", { name: /retirada/i })).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: /senha/i })).toHaveCount(0);
    expect(mutations).toHaveLength(0);
    expect(errors).toEqual([]);
    if (width === 390) {
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        audit.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
      await page.evaluate(() => {
        (document.activeElement as HTMLElement)?.blur();
        window.scrollTo(0, 0);
      });
      await page.screenshot({
        path: "artifacts/stage4-checkout-mobile.png",
        fullPage: true,
      });
    }
    if (width === 1440) {
      await page.evaluate(() => {
        (document.activeElement as HTMLElement)?.blur();
        window.scrollTo(0, 0);
      });
      await page.screenshot({
        path: "artifacts/stage4-checkout-desktop.png",
        fullPage: true,
      });
    }
  });
}
test("endpoints não criam pedidos sem configuração, rejeitam origem e protegem consultas", async ({
  request,
}) => {
  const invalidOrigin = await request.post("/api/checkout/orders", {
    data: {},
    headers: { Origin: "https://untrusted.invalid" },
  });
  expect(invalidOrigin.status()).toBe(403);
  const disabled = await request.post("/api/checkout/orders", {
    data: {},
    headers: { Origin: "http://localhost:3100" },
  });
  expect(disabled.status()).toBe(503);
  expect(await disabled.json()).toHaveProperty("error");
  const order = await request.get(
    "/api/orders/11111111-1111-4111-8111-111111111111",
  );
  expect(order.status()).toBe(404);
  const webhook = await request.post("/api/payments/webhook", {
    data: { type: "payment", data: { id: "1" } },
  });
  expect([401, 503]).toContain(webhook.status());
  const cron = await request.post("/api/jobs/expire-orders");
  expect(cron.status()).toBe(401);
});

for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  test(`escolha de frete atualiza total e respeita endereço em ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const orders: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().endsWith("/api/checkout/orders")
      )
        orders.push(request.url());
    });
    await page.route("**/api/checkout/quote", async (route) => {
      const data = route.request().postDataJSON();
      const items = data.items.map(
        (item: { variant_id: string; quantity: number }) => ({
          ...item,
          product_name: "Produto de teste",
          brand_name: "Teste",
          sku: "TESTE",
          label: "Unidade",
          unit_price_cents: 1000,
        }),
      );
      const base = {
        items,
        subtotal_cents: 1000,
        currency: "BRL",
        shipping_expires_at: new Date(Date.now() + 600000).toISOString(),
      };
      await route.fulfill({
        json: {
          quotes: [
            {
              ...base,
              shipping_cents: 1590,
              total_cents: 2590,
              shipping_token: "fixture-pac",
              shipping_service: "Correios · PAC",
              delivery_estimate: "5 dias úteis após a postagem",
            },
            {
              ...base,
              shipping_cents: 2590,
              total_cents: 3590,
              shipping_token: "fixture-sedex",
              shipping_service: "Correios · SEDEX",
              delivery_estimate: "2 dias úteis após a postagem",
            },
          ],
          paymentReady: false,
          testMode: true,
        },
      });
    });
    await page.goto("/produtos");
    await page
      .locator(".product-card:visible")
      .filter({ has: page.locator(".card-add:not(:disabled)") })
      .first()
      .locator(".card-add")
      .click();
    await page.goto("/carrinho");
    await page.getByRole("link", { name: "Continuar para compra" }).click();
    for (const [name, value] of [
      ["Nome completo", "Pessoa de Teste"],
      ["E-mail", "checkout@example.invalid"],
      ["Telefone com DDD", "14999999999"],
    ])
      await page.getByLabel(name, { exact: true }).fill(value);
    await page.getByRole("button", { name: "Continuar para entrega" }).click();
    for (const [name, value] of [
      ["CEP", "01018-020"],
      ["Rua ou avenida", "Rua de Teste"],
      ["Número", "1"],
      ["Bairro", "Teste"],
      ["Cidade", "São Paulo"],
      ["UF", "SP"],
    ])
      await page.getByLabel(name, { exact: true }).fill(value);
    await page
      .getByRole("button", { name: "Consultar entrega e revisar" })
      .click();
    await expect(page.getByRole("radio")).toHaveCount(2);
    await expect(page.getByRole("radio").first()).not.toBeChecked();
    await page.getByRole("radio", { name: /Correios · PAC/ }).check();
    await expect(page.locator(".checkout-total dd")).toContainText("25,90");
    await page.getByRole("radio", { name: /Correios · SEDEX/ }).check();
    await expect(page.locator(".checkout-total dd")).toContainText("35,90");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 390) {
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.evaluate(() => {
        (document.activeElement as HTMLElement)?.blur();
        window.scrollTo(0, 0);
      });
      await page.screenshot({
        path: "artifacts/national-shipping-mobile.png",
        fullPage: true,
      });
    }
    await page.getByRole("button", { name: "Editar endereço" }).click();
    await expect(
      page.getByRole("heading", { name: "Onde vamos entregar?", exact: true }),
    ).toBeFocused();
    await page.getByLabel("CEP", { exact: true }).fill("18800-332");
    await page
      .getByRole("button", { name: "Consultar entrega e revisar" })
      .click();
    await expect(page.getByRole("radio").first()).not.toBeChecked();
    await expect(page.getByRole("radio").last()).not.toBeChecked();
    await expect(
      page.getByRole("button", { name: "Compra indisponível" }),
    ).toBeDisabled();
    expect(orders).toHaveLength(0);
  });
}
