"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { currency } from "@/lib/currency";
import { useCart } from "@/contexts/cart-context";
import {
  paymentLabels,
  fulfillmentLabels,
  type Order,
} from "@/lib/checkout/schema";
export function OrderStatus({ id }: { id: string }) {
  const { lines, update, ready } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("");
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    if (!ready || order?.payment_status !== "paid") return;
    try {
      const key = `pet-order-cart-consumed:${order.id}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      return;
    }
    for (const line of lines) {
      const item = order.items.find((i) => i.variant_id === line.variantId);
      if (item)
        update(
          line.productId,
          line.variantId,
          Math.max(0, line.quantity - item.quantity),
        );
    }
  }, [ready, order, lines, update]);
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch(`/api/orders/${id}`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (alive) {
          if (!response.ok)
            setMessage(data.error || "Não foi possível consultar o pedido.");
          else {
            setOrder(data.order);
            setMessage("");
          }
        }
      } catch {
        if (alive)
          setMessage(
            "Não foi possível atualizar o pedido. Confira sua conexão.",
          );
      }
    }
    void load();
    const timer = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [id]);
  return (
    <div className="container checkout-page">
      <Link className="text-link" href="/produtos">
        Voltar à loja
      </Link>
      <h1>Seu pedido</h1>
      <p role="status">{message}</p>
      {order ? (
        <div className="checkout-layout">
          <section className="checkout-panel">
            <span className="eyebrow">
              PEDIDO DE TESTE #{order.order_number}
            </span>
            <h2>{paymentLabels[order.payment_status]}</h2>
            <p>Nenhuma venda real é realizada neste ambiente.</p>
            <p>{fulfillmentLabels[order.fulfillment_status]}</p>
            {order.payment_status === "pending" && (
              <>
                <p>
                  Reserva até{" "}
                  {new Date(order.expires_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                  . A confirmação depende da validação do provedor pelo
                  servidor.
                </p>
                <button
                  className="button"
                  disabled={retrying}
                  onClick={async () => {
                    setRetrying(true);
                    try {
                      const response = await fetch(`/api/orders/${id}`, {
                        method: "POST",
                      });
                      const result = await response.json();
                      if (result.redirect)
                        window.location.assign(result.redirect);
                      else
                        setMessage(result.error || "Pagamento indisponível.");
                    } catch {
                      setMessage("Não foi possível abrir o pagamento.");
                    } finally {
                      setRetrying(false);
                    }
                  }}
                >
                  {retrying ? "Abrindo…" : "Tentar pagamento de teste"}
                </button>
              </>
            )}
            {order.payment_status === "expired" && (
              <p>
                A reserva foi liberada. Você pode voltar ao carrinho e iniciar
                uma nova tentativa.
              </p>
            )}
            {order.payment_status === "review" && (
              <p>
                O pagamento chegou após o prazo da reserva. O administrador
                precisa revisar o caso antes de qualquer separação.
              </p>
            )}
            <h3>Entrega</h3>
            <p>
              {order.address.street}, {order.address.number}
              <br />
              {order.address.neighborhood} · {order.address.city} –{" "}
              {order.address.state}
              <br />
              CEP {order.address.postal_code}
            </p>
            <p>{order.delivery_estimate}</p>
          </section>
          <aside className="checkout-panel checkout-summary">
            <h2>Itens do pedido</h2>
            <ul>
              {order.items.map((item) => (
                <li key={item.variant_id}>
                  <div>
                    <strong>{item.product_name}</strong>
                    <span>
                      {item.label} · {item.quantity} un.
                    </span>
                  </div>
                  <span>{currency(item.unit_price_cents * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl>
              <div>
                <dt>Produtos</dt>
                <dd>{currency(order.subtotal_cents)}</dd>
              </div>
              <div>
                <dt>Entrega</dt>
                <dd>{currency(order.shipping_cents)}</dd>
              </div>
              <div className="checkout-total">
                <dt>Total</dt>
                <dd>{currency(order.total_cents)}</dd>
              </div>
            </dl>
          </aside>
        </div>
      ) : (
        !message && <p role="status">Consultando o pedido…</p>
      )}
    </div>
  );
}
