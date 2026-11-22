"use client";
import Image from "next/image";
import { useState } from "react";
import { MapPin, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product, Variant } from "@/types/product";
export function ProductGallery({ product }: { product: Product }) {
  const [index, setIndex] = useState(0);
  return (
    <div>
      <div className="detail-image">
        <Image
          src={product.images[index]}
          alt={product.imageAlts?.[index] || product.name}
          width={700}
          height={700}
          priority
        />
      </div>
      <div className="thumbnails">
        {product.images.map((src, i) => (
          <button
            key={src}
            aria-label={`Ver imagem ${i + 1}`}
            aria-pressed={index === i}
            onClick={() => setIndex(i)}
          >
            <Image src={src} alt="" width={70} height={70} />
          </button>
        ))}
      </div>
    </div>
  );
}
export function VariantSelector({
  variants,
  value,
  onChange,
}: {
  variants: Variant[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset className="variants">
      <legend>Selecione a opção</legend>
      {variants.map((v) => (
        <button
          key={v.id}
          aria-pressed={value === v.id}
          className={value === v.id ? "selected" : ""}
          onClick={() => onChange(v.id)}
        >
          {v.label}
        </button>
      ))}
    </fieldset>
  );
}
export function AddToCartButton({
  disabled,
  added,
  onClick,
}: {
  disabled: boolean;
  added: boolean;
  onClick: () => void;
}) {
  return (
    <Button disabled={disabled} onClick={onClick}>
      <ShoppingBag size={18} />
      {added ? "Adicionado" : "Adicionar ao carrinho"}
    </Button>
  );
}
export function DeliveryInfo() {
  return (
    <div className="delivery">
      <MapPin size={22} />
      <div>
        <strong>Um cuidado perto de você</strong>
        <p>
          Entrega local em Piraju será disponibilizada no lançamento. Esta
          versão não realiza pedidos.
        </p>
      </div>
    </div>
  );
}
