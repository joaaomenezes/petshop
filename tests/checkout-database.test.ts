import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
let db: PGlite;
const admin = "11111111-1111-4111-8111-111111111111",
  brand = "33333333-3333-4333-8333-333333333333",
  category = "44444444-4444-4444-8444-444444444444";
const session = "a".repeat(64),
  requestHash = "b".repeat(64);
const customer = {
  name: "Pessoa de Teste",
  email: "teste@example.invalid",
  phone: "14999999999",
};
const address = {
  postal_code: "18800000",
  street: "Rua de Teste",
  number: "1",
  complement: "",
  neighborhood: "Bairro de Teste",
  city: "Piraju",
  state: "SP",
};
async function role<T>(
  name: "anon" | "authenticated" | "service_role",
  run: () => Promise<T>,
) {
  await db.exec(`set role ${name}`);
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",
    [name === "authenticated" ? admin : "", name],
  );
  try {
    return await run();
  } finally {
    await db.exec("reset role");
  }
}
before(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;grant usage on schema auth to anon,authenticated,service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select,insert,delete on storage.objects to anon,authenticated;",
  );
  for (const f of [
    "202611220001_catalog.sql",
    "202611220002_storage.sql",
    "202611220003_integrity.sql",
    "202611220004_checkout.sql",
  ])
    await db.exec(
      (
        await readFile(
          new URL("../supabase/migrations/" + f, import.meta.url),
          "utf8",
        )
      ).replace(/^\uFEFF/, ""),
    );
  await db.query("insert into auth.users values($1)", [admin]);
  await db.query("call public.grant_admin($1)", [admin]);
  await db.query(
    "insert into brands(id,name,slug) values($1,'Marca de teste','marca')",
    [brand],
  );
  await db.query(
    "insert into categories(id,name,slug) values($1,'Categoria de teste','categoria')",
    [category],
  );
  await db.exec(
    `update shipping_settings set checkout_enabled=true,fee_cents=500,delivery_estimate='Prazo de teste',postal_ranges='[{"start":"18800000","end":"18899999"}]'::jsonb`,
  );
});
after(async () => db.close());
async function fixture() {
  const id = crypto.randomUUID(),
    variant = crypto.randomUUID();
  const payload = {
    id,
    updated_at: null,
    name: "Produto de teste",
    slug: "teste-" + id,
    brand_id: brand,
    category_id: category,
    species: "Cachorros",
    description: "",
    active: true,
    featured: false,
    images: [],
    variants: [
      {
        id: variant,
        label: "3 kg",
        sku: "SKU-" + variant,
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
  await role("authenticated", () =>
    db.query("select save_product($1::jsonb)", [JSON.stringify(payload)]),
  );
  return { id, variant };
}
async function create(
  variant: string,
  qty = 2,
  key = crypto.randomUUID(),
  hash = session,
) {
  const result = await role("service_role", () =>
    db.query<{ data: { id: string; payment_status: string } }>(
      "select checkout_create($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7) as data",
      [
        hash,
        key,
        requestHash,
        JSON.stringify(customer),
        JSON.stringify(address),
        JSON.stringify([{ variant_id: variant, quantity: qty }]),
        8990 * qty + 500,
      ],
    ),
  );
  return { ...result.rows[0].data, key };
}
async function balance(variant: string) {
  return (
    await db.query<{ stock_quantity: number; reserved_quantity: number }>(
      "select stock_quantity,reserved_quantity from product_variants where id=$1",
      [variant],
    )
  ).rows[0];
}
test("mudança de preço exige nova revisão e não reserva estoque", async () => {
  const { variant } = await fixture();
  await db.query("update product_variants set price_cents=9000 where id=$1", [
    variant,
  ]);
  await assert.rejects(
    create(variant, 2, crypto.randomUUID(), "c".repeat(64)),
    /Valores atualizados/,
  );
  assert.deepEqual(await balance(variant), {
    stock_quantity: 10,
    reserved_quantity: 0,
  });
});
test("criação de preferência usa exclusão temporária e reutiliza identificador salvo", async () => {
  const { variant } = await fixture();
  const hash = "d".repeat(64);
  const order = await create(variant, 2, crypto.randomUUID(), hash);
  await role("service_role", async () => {
    assert.equal(
      (
        await db.query<{ id: string | null }>(
          "select checkout_claim_preference($1,$2) as id",
          [order.id, hash],
        )
      ).rows[0].id,
      null,
    );
    await assert.rejects(
      db.query("select checkout_claim_preference($1,$2)", [order.id, hash]),
      /preparação/,
    );
    await db.query("select checkout_preference($1,$2,'pref-teste')", [
      order.id,
      hash,
    ]);
    assert.equal(
      (
        await db.query<{ id: string }>(
          "select checkout_claim_preference($1,$2) as id",
          [order.id, hash],
        )
      ).rows[0].id,
      "pref-teste",
    );
  });
});
async function payment(
  id: string,
  paymentId: string,
  event: string,
  status = "approved",
  amount = 18480,
  live = false,
) {
  return role("service_role", () =>
    db.query<{ status: string }>(
      "select checkout_payment($1,$2,$3,$4,$5,$6,$7) as status",
      [id, paymentId, event, status, amount, "BRL", live],
    ),
  );
}
test("checkout restringe pedidos e RPCs de criação ao servidor privado", async () => {
  await role("anon", async () => {
    await assert.rejects(db.query("select * from orders"));
    await assert.rejects(db.query("select * from order_items"));
    await assert.rejects(
      db.query("select checkout_get($1,$2)", [crypto.randomUUID(), session]),
    );
    await assert.rejects(db.query("select checkout_expire()"));
  });
  await role("authenticated", async () => {
    await assert.rejects(
      db.query("select checkout_get($1,$2)", [crypto.randomUUID(), session]),
    );
    await assert.rejects(
      db.query("insert into orders(customer_name) values('Tentativa')"),
    );
  });
});
test("cotação usa preço canônico e recusa cobertura, quantidades e duplicidade", async () => {
  const { variant } = await fixture();
  await role("anon", async () => {
    const quote = await db.query<{
      data: {
        subtotal_cents: number;
        shipping_cents: number;
        total_cents: number;
      };
    }>("select checkout_quote($1::jsonb,$2,$3,$4) as data", [
      JSON.stringify([
        { variant_id: variant, quantity: 2, unit_price_cents: 1 },
      ]),
      address.postal_code,
      address.city,
      address.state,
    ]);
    assert.equal(quote.rows[0].data.total_cents, 18480);
    await assert.rejects(
      db.query("select checkout_quote($1::jsonb,$2,$3,$4)", [
        JSON.stringify([{ variant_id: variant, quantity: 1 }]),
        "01000000",
        address.city,
        address.state,
      ]),
      /fora da área/,
    );
    await assert.rejects(
      db.query("select checkout_quote($1::jsonb,$2,$3,$4)", [
        JSON.stringify([{ variant_id: variant, quantity: 1.5 }]),
        address.postal_code,
        address.city,
        address.state,
      ]),
      /Quantidade/,
    );
    await assert.rejects(
      db.query("select checkout_quote($1::jsonb,$2,$3,$4)", [
        JSON.stringify([
          { variant_id: variant, quantity: 1 },
          { variant_id: variant, quantity: 1 },
        ]),
        address.postal_code,
        address.city,
        address.state,
      ]),
      /duplicadas/,
    );
  });
});
test("reserva é idempotente, limita disponibilidade e não altera saldo físico", async () => {
  const { variant } = await fixture();
  const order = await create(variant);
  const repeated = await create(variant, 2, order.key);
  assert.equal(order.id, repeated.id);
  assert.deepEqual(await balance(variant), {
    stock_quantity: 10,
    reserved_quantity: 2,
  });
  await assert.rejects(create(variant, 9), /estoque insuficiente/);
  assert.deepEqual(await balance(variant), {
    stock_quantity: 10,
    reserved_quantity: 2,
  });
  const available = await role("anon", () =>
    db.query<{ available_quantity: number }>(
      "select available_quantity from product_variant_availability where id=$1",
      [variant],
    ),
  );
  assert.equal(available.rows[0].available_quantity, 8);
});
test("consulta de pedido exige a mesma sessão e não expõe hashes", async () => {
  const { variant } = await fixture();
  const order = await create(variant);
  await role("service_role", async () => {
    const own = await db.query<{ data: Record<string, unknown> }>(
      "select checkout_get($1,$2) as data",
      [order.id, session],
    );
    assert.equal(own.rows[0].data.customer_email, customer.email);
    assert.equal("session_hash" in own.rows[0].data, false);
    const other = await db.query<{ data: unknown }>(
      "select checkout_get($1,$2) as data",
      [order.id, "c".repeat(64)],
    );
    assert.equal(other.rows[0].data, null);
  });
});
test("aprovação idempotente consome reserva uma vez e registra auditoria de sistema", async () => {
  const { variant } = await fixture();
  const order = await create(variant);
  assert.equal(
    (await payment(order.id, "1001", "event-1001")).rows[0].status,
    "paid",
  );
  await payment(order.id, "1001", "event-1001");
  await payment(order.id, "1001", "event-1001-again");
  assert.deepEqual(await balance(variant), {
    stock_quantity: 8,
    reserved_quantity: 0,
  });
  const audit = await db.query<{
    actor_kind: string;
    created_by: null;
    quantity: number;
  }>(
    "select actor_kind,created_by,quantity from inventory_movements where order_id=$1",
    [order.id],
  );
  assert.deepEqual(audit.rows, [
    { actor_kind: "system", created_by: null, quantity: 2 },
  ]);
});
test("pagamento real, moeda ou valor incorretos não confirmam pedido", async () => {
  const { variant } = await fixture();
  const order = await create(variant);
  await assert.rejects(
    payment(order.id, "1002", "bad-price", "approved", 1),
    /não corresponde/,
  );
  await assert.rejects(
    payment(order.id, "1002", "live", "approved", 18480, true),
    /não corresponde/,
  );
  await role("service_role", () =>
    assert.rejects(
      db.query("select checkout_payment($1,$2,$3,$4,$5,$6,$7)", [
        order.id,
        "1002",
        "currency",
        "approved",
        18480,
        "USD",
        false,
      ]),
      /não corresponde/,
    ),
  );
  assert.deepEqual(await balance(variant), {
    stock_quantity: 10,
    reserved_quantity: 2,
  });
});
test("expiração libera reserva sem duplicar saldo; aprovação tardia exige revisão", async () => {
  const { variant } = await fixture();
  const order = await create(variant);
  await db.query(
    "update orders set created_at=now()-interval '1 hour',expires_at=now()-interval '1 minute' where id=$1",
    [order.id],
  );
  await role("service_role", () =>
    db.query("select checkout_expire($1)", [order.id]),
  );
  await role("service_role", () =>
    db.query("select checkout_expire($1)", [order.id]),
  );
  assert.deepEqual(await balance(variant), {
    stock_quantity: 10,
    reserved_quantity: 0,
  });
  assert.equal(
    (await payment(order.id, "1003", "late")).rows[0].status,
    "review",
  );
  assert.deepEqual(await balance(variant), {
    stock_quantity: 10,
    reserved_quantity: 0,
  });
});
test("tentativa recusada não baixa estoque e entrega só avança após aprovação", async () => {
  const { variant } = await fixture();
  const order = await create(variant);
  await payment(order.id, "1004", "rejected", "rejected");
  assert.deepEqual(await balance(variant), {
    stock_quantity: 10,
    reserved_quantity: 2,
  });
  await role("authenticated", () =>
    assert.rejects(
      db.query("select admin_fulfill_order($1,'processing')", [order.id]),
      /pagos/,
    ),
  );
  await payment(order.id, "1005", "approved-1005");
  await role("authenticated", async () => {
    await assert.rejects(
      db.query("select admin_fulfill_order($1,'delivered')", [order.id]),
      /Transição/,
    );
    await db.query("select admin_fulfill_order($1,'processing')", [order.id]);
    await db.query("select admin_fulfill_order($1,'shipped')", [order.id]);
    await db.query("select admin_fulfill_order($1,'delivered')", [order.id]);
  });
  await payment(order.id, "1004", "late-rejection", "rejected");
  assert.equal(
    (
      await db.query<{ payment_status: string }>(
        "select payment_status from orders where id=$1",
        [order.id],
      )
    ).rows[0].payment_status,
    "paid",
  );
});
