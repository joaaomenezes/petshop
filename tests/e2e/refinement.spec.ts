import { test, expect } from "@playwright/test";

test("compra pelo card atualiza contador, confirma embalagem e persiste", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const card = page.locator(".product-card:visible").first();
  await expect(card.locator(".product-packaging")).toContainText("3 kg");
  await card
    .getByRole("button", { name: /Adicionar Ração natural para cães adultos/ })
    .click();
  await expect(card.getByRole("status")).toContainText(
    "Adicionado ao carrinho",
  );
  await expect(page.locator(".header-actions .badge")).toHaveText("1");
  await expect(page.locator(".mobile-nav .badge")).toHaveText("1");
  await card.getByRole("link", { name: "Ver carrinho", exact: true }).click();
  await expect(page.locator(".cart-item:visible")).toContainText("3 kg");
  await page.reload();
  await expect(page.locator(".cart-item:visible .quantity")).toContainText("1");
});

test("compra pelo card respeita estoque e produto indisponível", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "pet-piraju:cart:v1",
      JSON.stringify([{ productId: "p1", variantId: "base", quantity: 11 }]),
    ),
  );
  await page.goto("/produtos");
  const add = page.getByRole("button", {
    name: /Adicionar Ração natural para cães adultos/,
  });
  await expect(add).toBeEnabled();
  await add.click();
  await expect(add).toBeDisabled();
  await expect(add).toHaveText("Limite no carrinho");
  await expect(page.locator(".header-actions .badge")).toHaveText("12");
  await expect(
    page.getByRole("button", { name: /Adicionar Arranhador de fibra natural/ }),
  ).toBeDisabled();
});

test("categorias aplicam filtros e galeria troca a imagem", async ({
  page,
}) => {
  for (const [label, key] of [
    ["Cachorros", "especie"],
    ["Gatos", "especie"],
    ["Rações", "categoria"],
    ["Higiene", "categoria"],
    ["Petiscos", "categoria"],
    ["Acessórios", "categoria"],
  ]) {
    await page.goto("/");
    await page
      .locator(".category-card")
      .getByRole("heading", { name: label, exact: true })
      .click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get(key))
      .toBe(label);
    await expect(page.locator(".product-card:visible").first()).toBeVisible();
  }
  await page.goto("/produto/racao-natural-para-caes-adultos");
  await page.getByRole("button", { name: "Ver imagem 2" }).click();
  await expect(page.locator(".detail-image:visible img")).toHaveAttribute(
    "src",
    /detail/,
  );
});

for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  test(`header fixo e compra sem sobreposição em ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    if (width >= 1024) {
      await expect
        .poll(() =>
          page
            .locator(".hero:visible")
            .evaluate((el) => el.getBoundingClientRect().height),
        )
        .toBeLessThanOrEqual(460);
    }
    await page.evaluate(() => window.scrollTo(0, 650));
    await expect
      .poll(() =>
        page
          .locator(".site-header:visible")
          .evaluate((el) => Math.round(el.getBoundingClientRect().top)),
      )
      .toBe(0);
    await page.goto("/produto/racao-natural-para-caes-adultos");
    await page
      .locator(".buy-row:visible")
      .evaluate((el) => el.scrollIntoView({ block: "center" }));
    const buy = await page.locator(".buy-row:visible").boundingBox();
    const header = await page.locator(".site-header:visible").boundingBox();
    expect(buy!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
    if (width < 768) {
      const nav = await page.locator(".mobile-nav").boundingBox();
      expect(buy!.y + buy!.height).toBeLessThanOrEqual(nav!.y);
      await expect(page.locator(".mobile-nav a.active")).toContainText(
        "Categorias",
      );
    }
    await expect(
      page.locator(".buy-row:visible button").last(),
    ).toBeInViewport();
  });
}
