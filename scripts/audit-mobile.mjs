import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.AUDIT_BASE_URL || "http://localhost:3000";
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      isMobile: width < 768,
      hasTouch: width < 768,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const checks = [];
    let productPath = null;
    for (const path of ["/", "/produtos"]) {
      const response = await page.goto(base + path);
      assert.equal(response.status(), 200);
      await page.waitForLoadState("networkidle");
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `Overflow em ${width}px ${path}`,
      );
      assert.equal(
        await page
          .getByRole("heading", { name: "Não foi possível carregar a loja." })
          .count(),
        0,
      );
      if (path === "/produtos") {
        const card = page.locator(".product-card:visible").first();
        assert.ok(
          await card.count(),
          "Cadastre um produto ativo para auditar.",
        );
        productPath = await card.locator(".product-image").getAttribute("href");
        const cols = await page
          .locator(".product-grid:visible")
          .evaluate(
            (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
          );
        assert.equal(cols, width < 768 ? 2 : width >= 1024 ? 4 : 3);
        const button = card.locator(".card-add");
        const bounds = await button.boundingBox();
        assert.ok(bounds.height >= 44, "Botão de compra menor que 44px");
      }
      if (width < 768) {
        const nav = page.getByRole("navigation", {
          name: "Navegação principal",
        });
        assert.equal(await nav.isVisible(), true);
        for (const label of [
          "Início",
          "Categorias",
          "Buscar",
          "Carrinho",
          "Conta",
        ])
          assert.equal(
            await nav.getByText(label, { exact: true }).isVisible(),
            true,
          );
      }
      checks.push({
        path,
        status: response.status(),
        noHorizontalOverflow: true,
      });
    }
    await page.goto(base + productPath);
    await page.waitForLoadState("networkidle");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    const image = page.locator(".detail-image:visible img");
    await image.waitFor({ state: "visible" });
    assert.equal(
      await image.evaluate((img) => img.complete && img.naturalWidth > 0),
      true,
      "Imagem do produto não carregou",
    );
    await page
      .locator(".buy-row:visible")
      .evaluate((el) => el.scrollIntoView({ block: "center" }));
    const buy = await page.locator(".buy-row:visible").boundingBox();
    const header = await page.locator(".site-header:visible").boundingBox();
    assert.ok(buy.y >= header.y + header.height, "Compra coberta pelo header");
    if (width < 768) {
      const nav = await page.locator(".mobile-nav").boundingBox();
      assert.ok(
        buy.y + buy.height <= nav.y,
        "Compra coberta pela navegação inferior",
      );
    }
    const add = page
      .locator(".buy-row:visible")
      .getByRole("button", { name: "Adicionar ao carrinho", exact: true });
    assert.equal(
      await add.isEnabled(),
      true,
      "É necessário um produto com estoque para testar o carrinho.",
    );
    await add.click();
    await page
      .locator(".add-status:visible")
      .getByRole("link", { name: "Ver carrinho" })
      .waitFor();
    await page.goto(base + "/carrinho");
    await page.locator(".cart-item:visible").waitFor();
    assert.equal(await page.locator(".cart-item:visible").count(), 1);
    await page.reload();
    await page.locator(".cart-item:visible").waitFor();
    assert.equal(
      await page.locator(".cart-item:visible .quantity").innerText(),
      "1",
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    if (width === 390) {
      for (const path of ["/", "/produtos", productPath, "/carrinho"]) {
        await page.goto(base + path);
        await page.waitForLoadState("networkidle");
        const audit = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(
          audit.violations.map((v) => ({
            id: v.id,
            targets: v.nodes.map((n) => n.target),
          })),
          [],
          `Acessibilidade em ${path}`,
        );
      }
      await page.goto(base + "/produtos");
      await page.getByRole("button", { name: "Filtros", exact: true }).click();
      assert.equal(await page.getByRole("dialog").isVisible(), true);
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").count(), 0);
      await page
        .getByRole("navigation", { name: "Navegação principal" })
        .getByRole("button", { name: "Buscar", exact: true })
        .click();
      assert.equal(await page.getByRole("dialog").isVisible(), true);
      await page.keyboard.press("Escape");
    }
    assert.deepEqual(errors, [], "Erros JavaScript no navegador");
    results.push({
      width,
      status: "passed",
      pages: checks,
      productImageLoaded: true,
      buyAreaUnobstructed: true,
      cartPersists: true,
      javascriptErrors: 0,
      accessibility: width === 390 ? "4 pages passed" : undefined,
    });
    console.log(JSON.stringify(results.at(-1)));
    await context.close();
  }
  await fs.mkdir("artifacts", { recursive: true });
  await fs.writeFile(
    "artifacts/mobile-live-audit.json",
    JSON.stringify(
      { base, executedAt: new Date().toISOString(), results },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
