import type { AdminData, ProductInput } from "../src/lib/admin/schema";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
let db: PGlite;
const admin = "11111111-1111-4111-8111-111111111111",
  outsider = "22222222-2222-4222-8222-222222222222",
  brand = "33333333-3333-4333-8333-333333333333",
  category = "44444444-4444-4444-8444-444444444444";
let pid: string;
let vid: string;
async function asRole<T>(role: string, user: string, run: () => Promise<T>) {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  try {
    return await run();
  } finally {
    await db.exec("reset role");
  }
}
const asAdmin = <T>(run: () => Promise<T>) =>
  asRole("authenticated", admin, run);
function product(id = crypto.randomUUID(), sku = "PET-001") {
  return {
    id,
    updated_at: null,
    name: "Produto de teste",
    slug: "teste-" + id,
    brand_id: brand,
    category_id: category,
    species: "Cachorros",
    description: "Teste automatizado, não é seed de produção.",
    active: true,
    featured: true,
    images: [],
    variants: [
      {
        id: crypto.randomUUID(),
        label: "3 kg",
        sku,
        barcode: "",
        price_cents: 8990,
        cost_cents: 4500,
        weight_grams: 3000,
        stock_quantity: 10,
        min_stock_quantity: 5,
        active: true,
      },
    ],
  };
}
before(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select,insert,delete on storage.objects to anon,authenticated;",
  );
  for (const filename of [
    "202611220001_catalog.sql",
    "202611220002_storage.sql",
    "202611220003_integrity.sql",
  ])
    await db.exec(
      (
        await readFile(
          new URL("../supabase/migrations/" + filename, import.meta.url),
          "utf8",
        )
      ).replace(/^\uFEFF/, ""),
    );
  await db.query("insert into auth.users values($1),($2)", [admin, outsider]);
  await db.query("call public.grant_admin($1)", [admin]);
  await db.query(
    "insert into public.brands(id,name,slug) values($1,'Marca de teste','marca-teste')",
    [brand],
  );
  await db.query(
    "insert into public.categories(id,name,slug) values($1,'Categoria de teste','categoria-teste')",
    [category],
  );
});
after(async () => {
  await db.close();
});
test("RLS impede promoção, escrita pública e execução de RPC sem admin", async () => {
  await asRole("anon", "", async () => {
    await assert.rejects(
      db.query("insert into public.products(name) values('Intruso')"),
    );
    await assert.rejects(db.query("select public.admin_catalog()"));
  });
  await asRole("authenticated", outsider, async () => {
    assert.deepEqual(
      (await db.query("select * from public.admin_users")).rows,
      [],
    );
    await assert.rejects(
      db.query("insert into public.admin_users(user_id) values($1)", [
        outsider,
      ]),
    );
    await assert.rejects(db.query("call public.grant_admin($1)", [outsider]));
    await assert.rejects(
      db.query("select public.admin_catalog()"),
      /Administrador/,
    );
    await assert.rejects(
      db.query("select public.adjust_inventory($1,$2,1,$3)", [
        crypto.randomUUID(),
        "entrada",
        "Sem permissão",
      ]),
      /Administrador/,
    );
    const p = product();
    await assert.rejects(
      db.query("select public.save_product($1::jsonb)", [JSON.stringify(p)]),
      /Administrador/,
    );
  });
});
test("cadastro transacional cria variantes e registra estoque inicial com responsável", async () => {
  const p = product();
  pid = p.id;
  vid = p.variants[0].id;
  await asAdmin(() =>
    db.query("select public.save_product($1::jsonb)", [JSON.stringify(p)]),
  );
  const movements = await db.query<{
    quantity: number;
    created_by: string;
    reason: string;
  }>(
    "select quantity,created_by,reason from public.inventory_movements where variant_id=$1",
    [vid],
  );
  assert.equal(movements.rows[0].quantity, 10);
  assert.equal(movements.rows[0].created_by, admin);
  assert.match(movements.rows[0].reason, /inicial/);
});
test("público lê produtos ativos mas nunca custos ou dados privados", async () => {
  await asRole("anon", "", async () => {
    assert.equal(
      (await db.query("select id from public.products")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select price_cents from public.product_variants")).rows
        .length,
      1,
    );
    await assert.rejects(
      db.query("select cost_cents from public.product_variants"),
    );
    await assert.rejects(db.query("select * from public.suppliers"));
    await assert.rejects(db.query("select * from public.inventory_movements"));
  });
  await db.query("update public.products set active=false where id=$1", [pid]);
  await asRole("anon", "", async () => {
    assert.equal(
      (await db.query("select id from public.products")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select id from public.product_variants")).rows.length,
      0,
    );
  });
  await db.query("update public.products set active=true where id=$1", [pid]);
});
test("SKU duplicado desfaz produto e movimentação da mesma transação", async () => {
  const p = product(crypto.randomUUID(), "pet-001");
  await asAdmin(async () => {
    await assert.rejects(
      db.query("select public.save_product($1::jsonb)", [JSON.stringify(p)]),
      /unique|duplicate/i,
    );
  });
  assert.equal(
    (await db.query("select id from public.products where id=$1", [p.id])).rows
      .length,
    0,
  );
  assert.equal(
    (
      await db.query(
        "select id from public.product_variants where product_id=$1",
        [p.id],
      )
    ).rows.length,
    0,
  );
});
test("ajuste de estoque é auditado e impede saldo negativo ou quantidade inválida", async () => {
  await asAdmin(async () => {
    await db.query(
      "select public.adjust_inventory($1,'saida',3,'Ajuste autorizado')",
      [vid],
    );
    await assert.rejects(
      db.query(
        "select public.adjust_inventory($1,'saida',8,'Saída excessiva')",
        [vid],
      ),
      /insuficiente/,
    );
    await assert.rejects(
      db.query(
        "select public.adjust_inventory($1,'entrada',-1,'Quantidade inválida')",
        [vid],
      ),
      /inválida/,
    );
    await assert.rejects(
      db.query("select public.adjust_inventory($1,'entrada',1,'')", [vid]),
      /inválida/,
    );
    await assert.rejects(
      db.query(
        "update public.product_variants set stock_quantity=100 where id=$1",
        [vid],
      ),
    );
    await assert.rejects(
      db.query(
        "update public.inventory_movements set quantity=999 where variant_id=$1",
        [vid],
      ),
    );
  });
  const balance = await db.query<{ stock_quantity: number }>(
    "select stock_quantity from public.product_variants where id=$1",
    [vid],
  );
  assert.equal(balance.rows[0].stock_quantity, 7);
  const history = await db.query(
    "select id from public.inventory_movements where variant_id=$1",
    [vid],
  );
  assert.equal(history.rows.length, 2);
});
test("edição preserva identidade das variantes e exige controle separado de estoque", async () => {
  const snapshot = await asAdmin(() =>
    db.query<{ data: AdminData }>("select public.admin_catalog() as data"),
  );
  const data = snapshot.rows[0].data;
  const initial = data.products.find((p) => p.id === pid)!;
  const input: ProductInput = {
    ...initial,
    images: [],
    variants: data.variants
      .filter((v) => v.product_id === pid)
      .map((v) => ({ ...v, barcode: v.barcode || "" })),
    name: "Nome editado",
  };
  await asAdmin(() =>
    db.query("select public.save_product($1::jsonb)", [JSON.stringify(input)]),
  );
  assert.equal(
    (
      await db.query<{ name: string }>(
        "select name from public.products where id=$1",
        [pid],
      )
    ).rows[0].name,
    "Nome editado",
  );
  await asAdmin(() =>
    assert.rejects(
      db.query("select public.save_product($1::jsonb)", [
        JSON.stringify(input),
      ]),
      /outro administrador/,
    ),
  );
  const current = (
    await db.query<{ updated_at: string }>(
      "select updated_at::text from public.products where id=$1",
      [pid],
    )
  ).rows[0].updated_at;
  input.updated_at = current;
  input.variants[0].stock_quantity = 99;
  await asAdmin(() =>
    assert.rejects(
      db.query("select public.save_product($1::jsonb)", [
        JSON.stringify(input),
      ]),
      /controle de estoque/,
    ),
  );
});
test("categoria não aceita ciclos", async () => {
  const child = crypto.randomUUID();
  await db.query(
    "insert into public.categories(id,name,slug,parent_id) values($1,'Filha','filha',$2)",
    [child, category],
  );
  await assert.rejects(
    db.query("update public.categories set parent_id=$1 where id=$2", [
      child,
      category,
    ]),
    /descendente/,
  );
});
test("Storage só permite upload administrativo e leitura de imagens publicadas", async () => {
  await db.exec(
    "create policy broad_legacy_policy on storage.objects for all using(true) with check(true)",
  );
  await asRole("anon", "", async () => {
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values('product-images','malicioso.jpg')",
      ),
    );
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    );
  });
  await asAdmin(() =>
    db.query(
      "insert into storage.objects(bucket_id,name) values('product-images','draft/photo.jpg')",
    ),
  );
  await asRole("anon", "", async () =>
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    ),
  );
  await db.query(
    "insert into public.product_images(product_id,storage_path,alt_text,sort_order) values($1,'draft/photo.jpg','Imagem de teste',0)",
    [pid],
  );
  await asRole("anon", "", async () =>
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      1,
    ),
  );
  await asAdmin(async () => {
    const result = await db.query(
      "delete from storage.objects where name='draft/photo.jpg' returning name",
    );
    assert.equal(result.rows.length, 0);
  });
});
