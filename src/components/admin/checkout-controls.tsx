"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateShipping, fulfillOrder } from "@/lib/checkout/admin-actions";
import {
  fulfillmentLabels,
  type ShippingSettings,
  type Order,
} from "@/lib/checkout/schema";
export function ShippingManager({
  initial,
  national = false,
  origin = "",
  schemaReady = false,
}: {
  national?: boolean;
  origin?: string;
  schemaReady?: boolean;
  initial: ShippingSettings | null;
}) {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  if (national)
    return (
      <section className="admin-panel">
        <h2>Entrega para todo o Brasil</h2>
        <p>
          Melhor Envio configurado no servidor. Origem:{" "}
          {origin.replace(/^(\d{5})(\d{3})$/, "$1-$2")}. As opções disponíveis
          dependem do CEP, das transportadoras e das medidas dos produtos.
        </p>
        <p>
          {schemaReady
            ? "Cadastre peso com embalagem, altura, largura e comprimento em cada variante. A escolha e o preço do frete serão apresentados no checkout."
            : "Aplique a migration 202611220005_national_shipping.sql para liberar os campos e a cotação nacional."}
        </p>
        <p>
          Pagamentos continuam no fluxo de testes. Etiquetas não são compradas
          automaticamente. A tabela manual de entrega local não é utilizada
          enquanto esta integração estiver configurada.
        </p>
      </section>
    );
  if (!initial)
    return (
      <section className="admin-panel">
        <h2>Entrega e checkout</h2>
        <p>
          A configuração estará disponível após aplicar a migration
          202611220004_checkout.sql. Nenhuma taxa ou área foi inventada.
        </p>
      </section>
    );
  return (
    <form
      className="admin-form admin-panel"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const ranges = String(f.get("postal_ranges"))
          .split(/\r?\n/)
          .filter((v) => v.trim())
          .map((line) => {
            const [start, end] = line.trim().split(/\s*-\s*/);
            return { start, end };
          });
        start(async () => {
          const r = await updateShipping({
            checkout_enabled: f.get("checkout_enabled") === "on",
            city: f.get("city"),
            state: f.get("state"),
            fee_cents:
              String(f.get("fee_cents")).trim() === ""
                ? null
                : Number(f.get("fee_cents")),
            delivery_estimate: f.get("delivery_estimate"),
            postal_ranges: ranges,
          });
          setMessage(r.message);
          if (r.ok) router.refresh();
        });
      }}
    >
      <h2>Entrega no checkout</h2>
      <p>
        Somente entrega. Retirada está reservada para uma fase futura. Configure
        as regras reais antes de habilitar a consulta.
      </p>
      <div className="admin-form-grid">
        <label>
          Cidade
          <input name="city" required defaultValue={initial.city} />
        </label>
        <label>
          UF
          <input
            name="state"
            required
            pattern="[A-Z]{2}"
            maxLength={2}
            defaultValue={initial.state}
          />
        </label>
        <label>
          Taxa de entrega (centavos)
          <input
            name="fee_cents"
            type="number"
            min={0}
            max={1000000}
            step={1}
            defaultValue={initial.fee_cents ?? ""}
          />
        </label>
        <label>
          Prazo informado ao cliente
          <input
            name="delivery_estimate"
            maxLength={200}
            defaultValue={initial.delivery_estimate}
            placeholder="Informe o prazo efetivamente praticado"
          />
        </label>
      </div>
      <label>
        Faixas de CEP atendidas
        <textarea
          name="postal_ranges"
          rows={4}
          defaultValue={initial.postal_ranges
            .map((r) => `${r.start}-${r.end}`)
            .join("\n")}
          placeholder="Uma faixa por linha, com CEPs de 8 dígitos sem pontuação"
        />
      </label>
      <p>
        Formato: início-fim. Não habilite faixas cuja cobertura não tenha sido
        confirmada.
      </p>
      <label className="admin-checkbox">
        <input
          type="checkbox"
          name="checkout_enabled"
          defaultChecked={initial.checkout_enabled}
        />{" "}
        Habilitar consulta de entrega
      </label>
      <p>
        Isso não ativa vendas reais. O checkout aceita apenas o ambiente de
        testes quando todas as integrações estiverem prontas.
      </p>
      <button className="button" disabled={pending}>
        {pending ? "Salvando…" : "Salvar entrega"}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
export function FulfillmentControl({ order }: { order: Order }) {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const next = {
    pending: "processing",
    processing: "shipped",
    shipped: "delivered",
    delivered: null,
  }[order.fulfillment_status];
  return (
    <div className="admin-form">
      <p>{fulfillmentLabels[order.fulfillment_status]}</p>
      {order.payment_status === "paid" && next && (
        <button
          className="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await fulfillOrder(order.id, next);
              setMessage(result.message);
              if (result.ok) router.refresh();
            })
          }
        >
          {pending
            ? "Atualizando…"
            : `Marcar: ${fulfillmentLabels[next as keyof typeof fulfillmentLabels]}`}
        </button>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
