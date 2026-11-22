"use client";
import { Dialog } from "@/components/ui/dialog";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useOptimistic, startTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useCatalog } from "@/contexts/catalog-context";

import { filterProducts } from "@/lib/catalog";
import { EmptyState, ProductGrid } from "@/components/ui/shop";
export default function Catalog() {
  const { products, demo } = useCatalog();
  const urlParams = useSearchParams();
  const [query, setQuery] = useOptimistic(urlParams.toString());
  const params = new URLSearchParams(query);
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const result = filterProducts(
    new URLSearchParams(params.toString()),
    products,
  );
  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => {
      setQuery(next.toString());
      router.replace(`/produtos?${next}`, { scroll: false });
    });
  }
  const filters = (
    <ProductFilters
      params={params}
      set={set}
      clear={() =>
        startTransition(() => {
          setQuery("");
          router.replace("/produtos");
        })
      }
    />
  );
  return (
    <div className="container catalog">
      <div className="breadcrumb">Início / Produtos</div>
      <span className="eyebrow">PARA TODOS OS DIAS JUNTOS</span>
      <h1>Escolhas que fazem bem.</h1>
      <p className="muted">
        Tudo para cuidar de quem deixa sua vida mais feliz.
      </p>
      <form
        className="catalog-search"
        onSubmit={(e) => {
          e.preventDefault();
          set("q", String(new FormData(e.currentTarget).get("q") || ""));
        }}
      >
        <input
          type="search"
          name="q"
          key={params.get("q")}
          defaultValue={params.get("q") || ""}
          placeholder="Busque um produto ou marca"
          aria-label="Buscar produto ou marca"
        />
        <button className="button">Buscar</button>
      </form>
      <div className="catalog-layout">
        <aside className="filter-sidebar">{filters}</aside>
        <div>
          <div className="catalog-toolbar">
            <span>{result.length} produtos</span>
            <button className="filter-toggle" onClick={() => setDrawer(true)}>
              <SlidersHorizontal size={17} /> Filtros
              {["categoria", "especie", "marca", "min", "max"].filter((key) =>
                params.has(key),
              ).length > 0 && (
                <span className="filter-count">
                  {
                    ["categoria", "especie", "marca", "min", "max"].filter(
                      (key) => params.has(key),
                    ).length
                  }
                </span>
              )}
            </button>
            <select
              aria-label="Ordenar produtos"
              value={params.get("ordem") || ""}
              onChange={(e) => set("ordem", e.target.value)}
            >
              <option value="">Destaques</option>
              <option value="menor">Menor preço</option>
              <option value="maior">Maior preço</option>
              <option value="nome">Nome A–Z</option>
            </select>
          </div>
          {result.length ? (
            <ProductGrid products={result} />
          ) : (
            <EmptyState
              title="Nenhum produto encontrado"
              description="Experimente outra busca ou limpe os filtros."
            />
          )}
          {demo && (
            <p className="demo-note">
              Produtos e marcas fictícios. Catálogo exclusivamente
              demonstrativo.
            </p>
          )}
        </div>
      </div>
      {drawer && (
        <FilterDrawer open={drawer} onClose={() => setDrawer(false)}>
          <button
            className="modal-close"
            autoFocus
            onClick={() => setDrawer(false)}
            aria-label="Fechar filtros"
          >
            <X />
          </button>
          {filters}
          <button className="button" onClick={() => setDrawer(false)}>
            Ver {result.length} produtos
          </button>
        </FilterDrawer>
      )}
    </div>
  );
}

export function ProductFilters({
  params,
  set,
  clear,
}: {
  params: URLSearchParams;
  set: (key: string, value: string) => void;
  clear: () => void;
}) {
  const { brands, categories, products, demo } = useCatalog();
  return (
    <>
      <div className="filter-title">
        <h2>Filtrar por</h2>
        <button className="text-link" onClick={clear}>
          Limpar filtros
        </button>
      </div>
      {[
        {
          key: "categoria",
          label: "Categoria",
          options: demo
            ? [...new Set(products.map((p) => p.category))]
            : categories,
        },
        { key: "especie", label: "Seu pet", options: ["Cachorros", "Gatos"] },
        { key: "marca", label: "Marca", options: brands },
      ].map((f) => (
        <fieldset key={f.key}>
          <legend>{f.label}</legend>
          {f.options.map((o) => (
            <label className="check" key={o}>
              <input
                type="checkbox"
                checked={params.get(f.key) === o}
                onChange={(e) => set(f.key, e.target.checked ? o : "")}
              />
              {o}
            </label>
          ))}
        </fieldset>
      ))}
      <fieldset>
        <legend>Preço em R$</legend>
        <div className="price-inputs">
          <label>
            Mínimo
            <input
              type="number"
              min="0"
              value={params.get("min") || ""}
              placeholder="0"
              onChange={(e) => set("min", e.target.value)}
            />
          </label>
          <label>
            Máximo
            <input
              type="number"
              min="0"
              value={params.get("max") || ""}
              placeholder="Sem limite"
              onChange={(e) => set("max", e.target.value)}
            />
          </label>
        </div>
      </fieldset>
    </>
  );
}

export function FilterDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Filtros do catálogo" drawer>
      {children}
    </Dialog>
  );
}
