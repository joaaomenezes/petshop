import { test } from "node:test";
import assert from "node:assert/strict";
import {
  planSubcategories,
  subcategoryGroups,
  type CategoryRow,
} from "../src/lib/admin/subcategories";
const parents: CategoryRow[] = subcategoryGroups.map((group) => ({
  id: crypto.randomUUID(),
  name: group.parent,
  slug: "pai",
  parent_id: null,
  active: true,
}));
test("lote contém as 29 subcategorias com slugs únicos e vínculo correto, sem alterar pais", () => {
  const snapshot = structuredClone(parents);
  const plan = planSubcategories(parents);
  assert.equal(plan.missing.length, 29);
  assert.equal(new Set(plan.missing.map((c) => c.slug)).size, 29);
  assert.equal(
    plan.missing.find((c) => c.slug === "racoes-secas")?.parent_id,
    parents[0].id,
  );
  assert.equal(
    plan.missing.find((c) => c.slug === "cuidados-pelagem")?.parent_id,
    parents[6].id,
  );
  assert.deepEqual(parents, snapshot);
  const saved = [
    ...parents,
    ...plan.missing.map((c) => ({ ...c, id: crypto.randomUUID() })),
  ];
  assert.deepEqual(planSubcategories(saved), {
    missing: [],
    present: 29,
    total: 29,
  });
});
test("lote recusa pais ausentes e slugs em uso sob outro pai antes de gravar", () => {
  assert.throws(() => planSubcategories(parents.slice(1)), /categoria pai/);
  assert.throws(
    () =>
      planSubcategories([
        ...parents,
        {
          id: crypto.randomUUID(),
          name: "Rações Secas",
          slug: "racoes-secas",
          parent_id: parents[1].id,
          active: true,
        },
      ]),
    /outro nome ou categoria pai/,
  );
  assert.throws(
    () =>
      planSubcategories([
        ...parents,
        {
          id: crypto.randomUUID(),
          name: "Rações Secas",
          slug: "slug-antigo",
          parent_id: parents[0].id,
          active: true,
        },
      ]),
    /outro slug/,
  );
});

test("categoria pai inclui produtos das subcategorias e mantém filtro por pet", async () => {
  const { filterProducts } = await import("../src/lib/catalog");
  const { products } = await import("../src/data/products");
  const item = {
    ...products[0],
    category: "Rações Secas",
    categoryAncestors: ["Rações"],
    species: "Cachorros",
  };
  assert.equal(
    filterProducts(new URLSearchParams("categoria=Rações"), [item]).length,
    1,
  );
  assert.equal(
    filterProducts(new URLSearchParams("categoria=Rações Secas"), [item])
      .length,
    1,
  );
  assert.equal(
    filterProducts(new URLSearchParams("categoria=Rações&especie=Gatos"), [
      item,
    ]).length,
    0,
  );
  assert.equal(
    filterProducts(new URLSearchParams("categoria=Petiscos"), [item]).length,
    0,
  );
});
