import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("páginas principais atendem verificações automatizadas WCAG AA", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/",
    "/produtos",
    "/produto/racao-natural-para-caes-adultos",
    "/carrinho",
  ]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations,
      JSON.stringify(results.violations, null, 2),
    ).toEqual([]);
  }
});
test("produto indisponível bloqueia compra", async ({ page }) => {
  await page.goto("/produto/arranhador-de-fibra-natural");
  await expect(
    page.getByRole("button", { name: "Adicionar ao carrinho" }),
  ).toBeDisabled();
  await expect(page.locator("main:visible .availability")).toBeVisible();
});
