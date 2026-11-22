import { notFound } from "next/navigation";
import { guardAdmin } from "@/lib/admin/auth";
import { currency } from "@/lib/currency";
import { paymentLabels, type Order } from "@/lib/checkout/schema";
import { FulfillmentControl } from "@/components/admin/checkout-controls";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { db } = await guardAdmin();
  const result = await db
    .from("orders")
    .select("*,order_items(*)")
    .eq("id", id)
    .maybeSingle();
  if (result.error || !result.data) notFound();
  const order = { ...result.data, items: result.data.order_items } as Order;
  return (
    <>
      <div className="admin-heading">
        <h1>Pedido de teste #{order.order_number}</h1>
      </div>
      <div className="admin-panel">
        <h2>{paymentLabels[order.payment_status]}</h2>
        <p>Pagamento: {order.payment_id || "Aguardando provedor"}</p>
        <p>Reserva: {order.reservation_active ? "Ativa" : "Encerrada"}</p>
        <p>
          Prazo:{" "}
          {new Date(order.expires_at).toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          })}
        </p>
        <FulfillmentControl order={order} />
      </div>
      <section className="admin-panel">
        <h2>Cliente e entrega</h2>
        <p>
          {order.customer_name}
          <br />
          {order.customer_email}
          <br />
          {order.customer_phone}
        </p>
        <p>
          {order.address.street}, {order.address.number}{" "}
          {order.address.complement}
          <br />
          {order.address.neighborhood} · {order.address.city} –{" "}
          {order.address.state}
          <br />
          CEP {order.address.postal_code}
        </p>
        <p>{order.delivery_estimate}</p>
      </section>
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Embalagem / SKU</th>
              <th>Quantidade</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.variant_id}>
                <td>{item.product_name}</td>
                <td>
                  {item.label} · {item.sku}
                </td>
                <td>{item.quantity}</td>
                <td>{currency(item.unit_price_cents * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="admin-panel">
        <p>Produtos: {currency(order.subtotal_cents)}</p>
        <p>Entrega: {currency(order.shipping_cents)}</p>
        <h2>Total: {currency(order.total_cents)}</h2>
        <p>
          Reembolsos e cancelamentos financeiros são feitos no provedor. Não há
          botão para simular aprovação manual ou devolver estoque
          automaticamente sem conferência.
        </p>
      </section>
    </>
  );
}
