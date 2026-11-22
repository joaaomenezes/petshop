import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("rotas administrativas não permitem acesso sem sessão", async ({
  page,
}) => {
  for (const route of [
    "/admin",
    "/admin/produtos",
    "/admin/produtos/novo",
    "/admin/produtos/11111111-1111-4111-8111-111111111111",
    "/admin/categorias",
    "/admin/marcas",
    "/admin/estoque",
    "/admin/fornecedores",
    "/admin/configuracoes",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(
      page.getByRole("heading", { name: "Bem-vindo ao painel." }),
    ).toBeVisible();
  }
  await expect(
    page.getByRole("button", { name: "Entrar no painel" }),
  ).toBeDisabled();
  await expect(page.getByText("Supabase ainda não configurado.")).toBeVisible();
});
test("login responsivo sem interface administrativa fictícia", async ({
  page,
}) => {
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/login");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".mobile-nav")).toHaveCount(0);
  }
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});
test("validação de carrinho usa preços do servidor e não cria pedidos", async ({
  request,
}) => {
  const result = await request.post("/api/cart/validate", {
    data: [{ variantId: "base", quantity: 2 }],
  });
  // Demo IDs are product-scoped; ambiguous variants must not quote another product.
  expect(result.status()).toBe(400);
  const valid = await request.post("/api/cart/validate", {
    data: [{ productId: "p2", variantId: "base", quantity: 2 }],
  });
  expect(valid.status()).toBe(200);
  const quote = await valid.json();
  expect(quote.totalCents).toBe(12980);
  expect(quote.demo).toBe(true);
  expect(quote.valid).toBe(true);
  const forged = await request.post("/api/cart/validate", {
    data: [{ variantId: "base", quantity: 2, price: 1 }],
  });
  expect(forged.status()).toBe(400);
  const invalid = await request.post("/api/cart/validate", {
    data: [{ variantId: "missing", quantity: 1 }],
  });
  expect(invalid.status()).toBe(200);
  expect((await invalid.json()).valid).toBe(false);
  const negative = await request.post("/api/cart/validate", {
    data: [{ variantId: "base", quantity: -1 }],
  });
  expect(negative.status()).toBe(400);
});
