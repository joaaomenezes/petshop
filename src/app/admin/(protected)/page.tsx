import Link from "next/link";
import { getAdminData } from "@/lib/admin/data";
export default async function Dashboard() {
  const data = await getAdminData();
  const active = data.products.filter((p) => p.active);
  const variants = data.variants.filter(
    (v) => v.active && active.some((p) => p.id === v.product_id),
  );
  const low = new Set(
    variants
      .filter(
        (v) => v.stock_quantity > 0 && v.stock_quantity <= v.min_stock_quantity,
      )
      .map((v) => v.product_id),
  );
  const unavailable = active.filter(
    (p) => !variants.some((v) => v.product_id === p.id && v.stock_quantity > 0),
  );
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">CATÁLOGO E OPERAÇÃO</span>
          <h1>Visão geral</h1>
        </div>
        <Link className="button" href="/admin/produtos/novo">
          Cadastrar produto
        </Link>
      </div>
      <div className="admin-stats">
        {[
          ["Produtos ativos", active.length],
          ["Variantes cadastradas", data.variants.length],
          ["Produtos com estoque baixo", low.size],
          ["Produtos indisponíveis", unavailable.length],
        ].map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="admin-panel">
        <h2>Atenção ao estoque</h2>
        <p>
          Alertas consideram o estoque mínimo de cada variante ativa. Nenhum
          dado de faturamento ou pedidos é apresentado.
        </p>
        {variants.filter((v) => v.stock_quantity <= v.min_stock_quantity)
          .length ? (
          <ul>
            {variants
              .filter((v) => v.stock_quantity <= v.min_stock_quantity)
              .map((v) => (
                <li key={v.id}>
                  <Link href={`/admin/produtos/${v.product_id}`}>
                    {data.products.find((p) => p.id === v.product_id)?.name} ·{" "}
                    {v.label}
                  </Link>
                  <strong>
                    {v.stock_quantity} un. / mínimo {v.min_stock_quantity}
                  </strong>
                </li>
              ))}
          </ul>
        ) : (
          <p>Nenhuma variante com estoque baixo.</p>
        )}
        <Link className="text-link" href="/admin/estoque">
          Gerenciar estoque
        </Link>
      </section>
    </>
  );
}
