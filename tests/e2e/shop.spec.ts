import { test, expect } from "@playwright/test";
const slug = "racao-natural-para-caes-adultos";
for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  test(`navegação sem overflow em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/produtos", `/produto/${slug}`, "/carrinho"]) {
      await page.goto(route);
      await expect(page.locator("main:visible")).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
      if (route !== "/carrinho")
        await expect(page.locator("img").first()).toBeVisible();
    }
    if (width < 768) {
      await page.getByRole("button", { name: "Buscar", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page
        .getByRole("searchbox", { name: "Buscar produtos ou marcas" })
        .fill("Raíza");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Buscar", exact: true })
        .click();
      await expect(page).toHaveURL(/q=Ra/);
    }
  });
}
test("variante, quantidade, estoque, persistência e remoção", async ({
  page,
}) => {
  await page.goto(`/produto/${slug}`);
  await page.getByRole("button", { name: "10 kg", exact: true }).click();
  await expect(page.locator(".detail-copy:visible>.price")).toContainText(
    "269,70",
  );
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "Aumentar quantidade" }).click();
  await expect(
    page.getByRole("button", { name: "Aumentar quantidade" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  await expect(page.locator(".add-status:visible")).toContainText(
    "Produto adicionado",
  );
  await page.goto("/carrinho");
  await expect(page.locator(".cart-item:visible")).toHaveCount(1);
  await expect(page.locator(".cart-item:visible .quantity")).toContainText("5");
  await expect(page.locator(".total:visible")).toContainText("1.348,50");
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(page.locator(".cart-item:visible .quantity")).toContainText("5");
  await page.getByRole("button", { name: "Diminuir quantidade" }).click();
  await expect(page.locator(".total:visible")).toContainText("1.078,80");
  await page.getByRole("button", { name: /Remover Ração/ }).click();
  await expect(page.getByText("Um carinho começa por aqui.")).toBeVisible();
});
test("filtros sincronizam URL, vazio e limpeza", async ({ page }) => {
  await page.goto("/produtos");
  await page.getByRole("checkbox", { name: "Rações", exact: true }).check();
  await expect(page).toHaveURL(/categoria=/);
  await page.getByRole("checkbox", { name: "Gatos", exact: true }).check();
  await expect(page.locator(".product-card:visible")).toHaveCount(2);
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(page.locator(".product-card:visible")).toHaveCount(2);
  await page
    .getByRole("searchbox", { name: "Buscar produto ou marca", exact: true })
    .fill("inexistente");
  await page.locator(".catalog-search button").click();
  await expect(page.getByText("Nenhum produto encontrado")).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(page.locator(".product-card:visible")).toHaveCount(18);
});
test("drawer acessível e conta em breve", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/produtos");
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("checkbox", { name: "Petiscos", exact: true }).check();
  await page.getByRole("button", { name: "Ver 2 produtos" }).click();
  await expect(page.locator(".product-card:visible")).toHaveCount(2);
  await page.getByRole("button", { name: "Conta", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Sua conta, em breve.");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
