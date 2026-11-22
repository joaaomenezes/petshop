"use client";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, Check } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/contexts/cart-context";
import { currency } from "@/lib/currency";
import type { Product } from "@/types/product";
export function PriceDisplay({ value }: { value: number }) {
  return <span className="price">{currency(value)}</span>;
}
export function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow?: string;
  title: string;
}) {
  return (
    <div className="section-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
    </div>
  );
}
export function QuantitySelector({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="quantity">
      <button
        aria-label="Diminuir quantidade"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={16} />
      </button>
      <span aria-live="polite">{value}</span>
      <button
        aria-label="Aumentar quantidade"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty">
      <ShoppingBag size={36} />
      <h2>{title}</h2>
      <p>{description}</p>
      <Link className="button" href="/produtos">
        Explorar produtos
      </Link>
    </div>
  );
}
export function ProductCard({ product: p }: { product: Product }) {
  const { lines, add, ready } = useCart();
  const [added, setAdded] = useState(false);
  const variant = p.variants[0];
  const quantity =
    lines.find(
      (line) => line.productId === p.id && line.variantId === variant.id,
    )?.quantity ?? 0;
  const exhausted = quantity >= variant.stock;
  return (
    <article className="product-card">
      <Link href={`/produto/${p.slug}`} className="product-image">
        <Image
          src={p.images[0]}
          alt={p.imageAlts?.[0] || p.name}
          width={500}
          height={500}
        />
        {!p.variants[0].stock && <span className="tag">Indisponível</span>}
      </Link>
      <div className="product-meta">{p.brand}</div>
      <Link href={`/produto/${p.slug}`}>
        <h3>{p.name}</h3>
      </Link>
      <p className="product-packaging">
        {variant.label}
        {p.variants.length > 1 && (
          <Link href={`/produto/${p.slug}`}> · Mais opções</Link>
        )}
      </p>
      <div className="product-bottom">
        <PriceDisplay value={variant.price} />
      </div>
      <button
        className="button card-add"
        disabled={!ready || exhausted}
        aria-label={`Adicionar ${p.name} — ${variant.label} ao carrinho`}
        onClick={() => {
          add(p.id, variant.id, 1);
          setAdded(true);
        }}
      >
        {added ? <Check size={17} /> : <ShoppingBag size={17} />}
        {!variant.stock
          ? "Indisponível"
          : exhausted
            ? "Limite no carrinho"
            : added
              ? "Adicionar mais"
              : "Adicionar"}
      </button>
      <div className="card-feedback" role="status">
        {added && (
          <>
            Adicionado ao carrinho. <Link href="/carrinho">Ver carrinho</Link>
          </>
        )}
      </div>
    </article>
  );
}
export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
