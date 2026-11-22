"use client";
import { useState } from "react";
import {
  ProductGallery,
  VariantSelector,
  AddToCartButton,
  DeliveryInfo,
} from "./product-controls";
import Link from "next/link";
import { Check } from "lucide-react";
import type { Product } from "@/types/product";
import { useCart } from "@/contexts/cart-context";
import {
  PriceDisplay,
  ProductGrid,
  QuantitySelector,
  SectionHeading,
} from "@/components/ui/shop";
import { useCatalog } from "@/contexts/catalog-context";
export default function ProductDetail({ product: p }: { product: Product }) {
  const { products, demo } = useCatalog();
  const [variantId, setVariant] = useState(p.variants[0].id);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { lines, add, ready } = useCart();
  const v = p.variants.find((v) => v.id === variantId)!;
  const inCart =
    lines.find((l) => l.productId === p.id && l.variantId === v.id)?.quantity ||
    0;
  const available = v.stock - inCart;
  return (
    <div className="container detail">
      <div className="breadcrumb">
        <Link href="/">Início</Link> / <Link href="/produtos">Produtos</Link> /{" "}
        {p.name}
      </div>
      <div className="detail-grid">
        <ProductGallery product={p} />
        <div className="detail-copy">
          <span className="eyebrow">
            {p.brand} · {p.species}
          </span>
          <h1>{p.name}</h1>
          <p className="product-intro">
            Uma escolha para a rotina do seu pet. Selecione a embalagem e a
            quantidade abaixo.
          </p>
          <PriceDisplay value={v.price} />
          <VariantSelector
            variants={p.variants}
            value={v.id}
            onChange={(id) => {
              setVariant(id);
              setQuantity(1);
              setAdded(false);
            }}
          />
          <p className="availability">
            {v.stock ? (
              <>
                <Check size={16} />{" "}
                {demo ? "Em estoque demonstrativo" : "Em estoque"} · {available}{" "}
                disponíveis
              </>
            ) : (
              "Produto indisponível"
            )}
          </p>
          <div className="buy-row">
            <QuantitySelector
              value={quantity}
              max={Math.max(1, available)}
              onChange={(n) => {
                setQuantity(n);
                setAdded(false);
              }}
            />
            <AddToCartButton
              disabled={!ready || available < quantity || !v.stock}
              added={added}
              onClick={() => {
                add(p.id, v.id, quantity);
                setAdded(true);
              }}
            />
          </div>
          <div role="status" className="add-status">
            {added && (
              <>
                Produto adicionado. <Link href="/carrinho">Ver carrinho</Link>
              </>
            )}
          </div>
          <DeliveryInfo />
          <details className="product-description">
            <summary>Sobre este produto</summary>
            <p>{p.description}</p>
          </details>
          <div className="specs">
            <span>SKU: {v.sku}</span>
            <span>Peso: {v.weight} g</span>
            {demo && <span>Produto e marca fictícios</span>}
          </div>
        </div>
      </div>
      <section className="related">
        <SectionHeading title="Outras escolhas para seu pet" />
        <ProductGrid
          products={products
            .filter(
              (item) =>
                item.id !== p.id &&
                (item.species === p.species || item.category === p.category),
            )
            .slice(0, 4)}
        />
      </section>
    </div>
  );
}
