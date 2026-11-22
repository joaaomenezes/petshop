"use client";
import { useState } from "react";
import Link from "next/link";
import type { AdminData } from "@/lib/admin/schema";
import { currency } from "@/lib/currency";
export function ProductList({ data }: { data: AdminData }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const list = data.products.filter(
    (p) =>
      `${p.name} ${p.slug} ${data.variants
        .filter((v) => v.product_id === p.id)
        .map((v) => v.sku)
        .join(" ")}`
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (!status || String(p.active) === status),
  );
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">CATÁLOGO</span>
          <h1>Produtos</h1>
        </div>
        <Link href="/admin/produtos/novo" className="button">
          Cadastrar produto
        </Link>
      </div>
      <div className="admin-form admin-filter">
        <label>
          Buscar nome ou SKU
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </label>
        <span>{list.length} produtos</span>
      </div>
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Status</th>
              <th>Variantes</th>
              <th>Preço inicial</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const v = data.variants.filter((v) => v.product_id === p.id);
              return (
                <tr key={p.id}>
                  <td>
                    {p.name}
                    <small>{p.slug}</small>
                  </td>
                  <td>{p.active ? "Ativo" : "Inativo"}</td>
                  <td>{v.length}</td>
                  <td>
                    {v.length
                      ? currency(Math.min(...v.map((v) => v.price_cents)))
                      : "Sem variante"}
                  </td>
                  <td>
                    <Link
                      className="text-link"
                      href={`/admin/produtos/${p.id}`}
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!list.length && (
          <p className="admin-empty">
            Nenhum produto encontrado. Cadastre o primeiro produto ou altere a
            busca.
          </p>
        )}
      </div>
    </>
  );
}
