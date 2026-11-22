import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  test(`navegação por pet e categorias em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    if (width >= 768) {
      const nav = page.getByRole("navigation", {
        name: "Categorias",
        exact: true,
      });
      await expect(
        nav.locator(":scope > a, :scope > details > summary"),
      ).toHaveText([
        "Cachorros",
        "Gatos",
        "Rações",
        "Petiscos",
        "Brinquedos",
        "Higiene",
        "Acessórios",
        "Mais",
      ]);
      const dogs = nav
        .locator("details")
        .filter({ has: page.locator("summary", { hasText: "Cachorros" }) });
      await dogs.locator("summary").click();
      await expect(
        dogs.getByRole("heading", { name: "Alimentação" }),
      ).toBeVisible();
      await expect(
        dogs.getByRole("link", { name: "Rações", exact: true }),
      ).toHaveAttribute("href", /especie=Cachorros/);
      const rect = await dogs.locator(".catalog-dropdown-panel").boundingBox();
      expect(rect!.x).toBeGreaterThanOrEqual(0);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
      if (width === 1440)
        await page.screenshot({
          path: "artifacts/navigation-desktop.png",
          fullPage: true,
        });
      await dogs.locator("summary").press("Escape");
      await expect(dogs).not.toHaveAttribute("open", "");
      await nav.locator("summary").filter({ hasText: "Mais" }).click();
      await expect(
        nav.getByRole("link", { name: "Camas", exact: true }),
      ).toBeVisible();
      await expect(
        nav.getByRole("link", { name: "Cuidados", exact: true }),
      ).toBeVisible();
      await page.getByRole("heading").first().click();
      await expect(nav.locator("details[open]")).toHaveCount(0);
    } else {
      await page
        .getByRole("navigation", { name: "Navegação principal" })
        .getByRole("link", { name: "Categorias" })
        .click();
      await expect(page).toHaveURL(/\/categorias$/);
      await expect(
        page.getByRole("heading", { name: "Explore a loja", level: 1 }),
      ).toBeVisible();
      const main = page.getByRole("main");
      await expect(
        main.getByRole("link", { name: /Cachorros/ }),
      ).toHaveAttribute("href", /especie=Cachorros/);
      await expect(main.getByRole("link", { name: /Gatos/ })).toHaveAttribute(
        "href",
        /especie=Gatos/,
      );
      if (width === 390) {
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
        await page.screenshot({
          path: "artifacts/navigation-mobile.png",
          fullPage: true,
        });
      }
      await main.getByRole("link", { name: /Gatos/ }).click();
      await expect(page).toHaveURL(/especie=Gatos/);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
