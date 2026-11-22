"use client";
import Link from "next/link";
import Image from "next/image";
import { Trash2, LockKeyhole } from "lucide-react";
import { useCatalog } from "@/contexts/catalog-context";
import { useCart } from "@/contexts/cart-context";
import { cartTotal } from "@/lib/cart";
import {
  EmptyState,
  PriceDisplay,
  QuantitySelector,
} from "@/components/ui/shop";
export default function Cart() {
  const { lines, update, ready } = useCart();
  if (!ready)
    return <p className="container loading">Carregando seu carrinho…</p>;
  return (
    <div className="container cart-page">
      <div className="breadcrumb">
        <Link href="/">Início</Link> / Carrinho
      </div>
      <h1>Seu carrinho</h1>
      {!lines.length ? (
        <EmptyState
          title="Um carinho começa por aqui."
          description="Seu carrinho está vazio. Explore nossas escolhas para seu pet."
        />
      ) : (
        <div className="cart-layout">
          <div>
            {lines.map((l) => (
              <CartItem
                key={l.productId + l.variantId}
                line={l}
                onUpdate={(n) => update(l.productId, l.variantId, n)}
              />
            ))}
            <Link className="text-link" href="/produtos">
              Continuar comprando
            </Link>
          </div>
          <CartSummary lines={lines} />
        </div>
      )}
    </div>
  );
}

export function CartItem({
  line: l,
  onUpdate,
}: {
  line: import("@/lib/cart").CartLine;
  onUpdate: (n: number) => void;
}) {
  const { products } = useCatalog();
  const p = products.find((p) => p.id === l.productId)!;
  const v = p.variants.find((v) => v.id === l.variantId)!;
  return (
    <article className="cart-item" key={p.id + v.id}>
      <Link href={`/produto/${p.slug}`}>
        <Image src={p.images[0]} alt={p.name} width={120} height={120} />
      </Link>
      <div>
        <span className="eyebrow">{p.brand}</span>
        <Link href={`/produto/${p.slug}`}>
          <h3>{p.name}</h3>
        </Link>
        <p>
          {v.label} · {v.sku}
        </p>
        <QuantitySelector
          value={l.quantity}
          max={v.stock}
          onChange={(n) => onUpdate(n)}
        />
      </div>
      <div className="cart-item-end">
        <PriceDisplay value={v.price * l.quantity} />
        <button aria-label={`Remover ${p.name}`} onClick={() => onUpdate(0)}>
          <Trash2 size={18} />
        </button>
      </div>
    </article>
  );
}

export function CartSummary({
  lines,
}: {
  lines: import("@/lib/cart").CartLine[];
}) {
  const { products } = useCatalog();
  return (
    <aside className="cart-summary">
      <h2>Resumo do carrinho</h2>
      <div>
        <span>Subtotal</span>
        <PriceDisplay value={cartTotal(lines, products)} />
      </div>
      <div>
        <span>Entrega</span>
        <span>Disponível no lançamento</span>
      </div>
      <div className="total">
        <strong>Total dos produtos</strong>
        <PriceDisplay value={cartTotal(lines, products)} />
      </div>
      <p>
        <LockKeyhole size={18} /> Checkout em breve
      </p>
      <p>
        O checkout estará disponível em uma versão futura. Nenhum pedido ou
        pagamento é realizado nesta versão.
      </p>
    </aside>
  );
}
