import Link from "next/link";
import { guardAdmin } from "@/lib/admin/auth";
import { currency } from "@/lib/currency";
import { paymentLabels, type Order } from "@/lib/checkout/schema";
export default async function Page() {
  const { db } = await guardAdmin();
  const result = await db
    .from("orders")
    .select(
      "id,order_number,customer_name,payment_status,total_cents,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">OPERAÇÃO DE TESTES</span>
          <h1>Pedidos</h1>
        </div>
      </div>
      <p>
        Pedidos desta etapa são exclusivamente de testes. A página de retorno do
        pagamento não altera o status do pedido.
      </p>
      {result.error ? (
        <section className="admin-panel">
          <h2>Pedidos ainda não configurados</h2>
          <p>Aplique a migration do checkout para ativar esta área.</p>
        </section>
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Pagamento</th>
                <th>Total</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {(
                result.data as Pick<
                  Order,
                  | "id"
                  | "order_number"
                  | "customer_name"
                  | "payment_status"
                  | "total_cents"
                >[]
              ).map((order) => (
                <tr key={order.id}>
                  <td>#{order.order_number}</td>
                  <td>{order.customer_name}</td>
                  <td>{paymentLabels[order.payment_status]}</td>
                  <td>{currency(order.total_cents)}</td>
                  <td>
                    <Link
                      className="text-link"
                      href={`/admin/pedidos/${order.id}`}
                    >
                      Ver pedido
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!result.data.length && (
            <p className="admin-empty">Nenhum pedido de teste registrado.</p>
          )}
        </div>
      )}
    </>
  );
}
