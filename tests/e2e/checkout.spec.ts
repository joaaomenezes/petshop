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
