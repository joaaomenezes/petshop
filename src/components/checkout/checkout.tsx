"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/cart-context";
import { useCatalog } from "@/contexts/catalog-context";
import { currency } from "@/lib/currency";
import { cartTotal } from "@/lib/cart";
import {
  customerSchema,
  addressSchema,
  type Customer,
  type Address,
  type Quote,
} from "@/lib/checkout/schema";
import { EmptyState } from "@/components/ui/shop";
export function Checkout({ paymentReady }: { paymentReady: boolean }) {
  const router = useRouter();
  const { lines, ready } = useCart();
  const { products, demo } = useCatalog();
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    email: "",
    phone: "",
  });
  const [address, setAddress] = useState<Address>({
    postal_code: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "Piraju",
    state: "SP",
  });
  const [shippingOptions, setShippingOptions] = useState<Quote[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const idempotency = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  function move(next: number) {
    setStep(next);
    setMessage("");
    requestAnimationFrame(() => {
      heading.current?.focus();
      heading.current?.scrollIntoView({ block: "start", behavior: "auto" });
    });
  }
  const items = lines.map((l) => ({
    variant_id: l.variantId,
    quantity: l.quantity,
  }));
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    if (step === 0) {
      const parsed = customerSchema.safeParse(customer);
      if (!parsed.success) {
        setMessage(parsed.error.issues[0].message);
        return;
      }
      setCustomer(parsed.data);
      move(1);
      return;
    }
    if (step === 1) {
      setShippingOptions([]);
      setQuote(null);
      const parsed = addressSchema.safeParse(address);
      if (!parsed.success) {
        setMessage(parsed.error.issues[0].message);
        return;
      }
      if (demo) {
        setAddress(parsed.data);
        setQuote(null);
        move(2);
        setMessage(
          "Modo demonstração: entrega e pagamento indisponíveis. Nenhum pedido foi criado.",
        );
        return;
      }
      setPending(true);
      try {
        const response = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items, address: parsed.data }),
        });
        const result = await response.json();
        if (!response.ok) {
          if (result.configurationPending) {
            setAddress(parsed.data);
            setQuote(null);
            move(2);
          }
          setMessage(result.error || "Não foi possível consultar a entrega.");
          return;
        }
        setAddress(parsed.data);
        setShippingOptions(result.quotes || []);
        setQuote(result.quote || null);
        move(2);
      } catch {
        setMessage(
          "Não foi possível consultar a entrega. Confira sua conexão e tente novamente.",
        );
      } finally {
        setPending(false);
      }
      return;
    }
    if (!paymentReady || !quote) return;
    if (
      quote.shipping_expires_at &&
      Date.parse(quote.shipping_expires_at) <= Date.now()
    ) {
      setQuote(null);
      setShippingOptions([]);
      move(1);
      setMessage("A cotação expirou. Consulte a entrega novamente.");
      return;
    }
    setPending(true);
    try {
      const fingerprint = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(
              JSON.stringify({
                items,
                customer,
                address,
                total: quote.total_cents,
                shipping: quote.shipping_token,
              }),
            ),
          ),
        ),
      )
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("");
      try {
        const stored = JSON.parse(
          sessionStorage.getItem("pet-checkout-attempt") || "null",
        );
        if (
          stored?.fingerprint === fingerprint &&
          typeof stored.id === "string" &&
          /^[a-f0-9-]{36}$/.test(stored.id)
        )
          idempotency.current = stored.id;
        else idempotency.current = crypto.randomUUID();
        sessionStorage.setItem(
          "pet-checkout-attempt",
          JSON.stringify({ fingerprint, id: idempotency.current }),
        );
      } catch {
        if (!idempotency.current) idempotency.current = crypto.randomUUID();
      }
      const response = await fetch("/api/checkout/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          customer,
          address,
          idempotency_key: idempotency.current,
          expected_total_cents: quote.total_cents,
          ...(quote.shipping_token
            ? { shipping_token: quote.shipping_token }
            : {}),
        }),
      });
      const result = await response.json();
      if (result.redirect) {
        window.location.assign(result.redirect);
        return;
      }
      if (result.orderId) {
        router.push(`/pedido/${result.orderId}`);
        return;
      }
      setMessage(
        result.error || "Não foi possível continuar. Revise seu pedido.",
      );
    } catch {
      setMessage(
        "Não foi possível confirmar a operação. Tente novamente com os mesmos dados para evitar duplicidade.",
      );
    } finally {
      setPending(false);
    }
  }
  if (!ready)
    return (
      <p className="container loading" role="status">
        Carregando seu carrinho…
      </p>
    );
  if (!lines.length)
    return (
      <EmptyState
        title="Seu carrinho está vazio"
        description="Escolha os produtos antes de continuar para a compra."
      />
    );
  return (
    <div className="container checkout-page">
      <div className="breadcrumb">
        <Link href="/carrinho">Carrinho</Link> / Finalizar compra
      </div>
      <div className="checkout-title">
        <span className="eyebrow">CUIDADO ATÉ CHEGAR À SUA CASA</span>
        <h1>Finalizar compra</h1>
        <p>Compre como visitante. Você não precisa criar uma senha.</p>
      </div>
      <ol className="checkout-steps" aria-label="Etapas da compra">
        {["Identificação", "Entrega", "Revisão"].map((label, index) => (
          <li key={label} aria-current={step === index ? "step" : undefined}>
            <span aria-hidden="true">{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {!paymentReady && (
        <div className="checkout-notice" role="note">
          <strong>Pagamento online em preparação</strong>
          <p>
            Você pode preencher e revisar seus dados. Nenhum pedido ou cobrança
            será realizado enquanto a compra estiver indisponível.
          </p>
        </div>
      )}
      {paymentReady && (
        <div className="checkout-notice">
          <strong>Ambiente de testes</strong>
          <p>
            Este fluxo não realiza vendas reais. Utilize somente dados e meios
            de pagamento de teste.
          </p>
        </div>
      )}
      <div className="checkout-layout">
        <form className="checkout-form admin-form" onSubmit={submit}>
          <section className="checkout-panel">
            <h2 ref={heading} tabIndex={-1}>
              {
                ["Seus dados", "Onde vamos entregar?", "Confira seu pedido"][
                  step
                ]
              }
            </h2>
            {step === 0 && (
              <>
                <label htmlFor="checkout-name">
                  Nome completo
                  <input
                    id="checkout-name"
                    autoComplete="name"
                    name="name"
                    value={customer.name}
                    required
                    minLength={2}
                    maxLength={120}
                    onChange={(e) => {
                      idempotency.current = null;
                      setCustomer({ ...customer, name: e.target.value });
                    }}
                  />
                </label>
                <label htmlFor="checkout-email">
                  E-mail
                  <input
                    id="checkout-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={customer.email}
                    required
                    maxLength={254}
                    onChange={(e) => {
                      idempotency.current = null;
                      setCustomer({ ...customer, email: e.target.value });
                    }}
                  />
                </label>
                <label htmlFor="checkout-phone">
                  Telefone com DDD
                  <input
                    id="checkout-phone"
                    type="tel"
                    name="phone"
                    autoComplete="tel-national"
                    inputMode="tel"
                    value={customer.phone}
                    required
                    maxLength={20}
                    placeholder="(14) 99999-9999"
                    onChange={(e) => {
                      idempotency.current = null;
                      setCustomer({ ...customer, phone: e.target.value });
                    }}
                  />
                </label>
                <p className="checkout-help">
                  Usaremos esses dados para identificar seu pedido e entrar em
                  contato sobre a compra.
                </p>
              </>
            )}
            {step === 1 && (
              <>
                <p className="checkout-help">
                  Recebimento por entrega no endereço informado.
                </p>
                <div className="checkout-field-grid">
                  {[
                    {
                      key: "postal_code",
                      label: "CEP",
                      auto: "postal-code",
                      max: 9,
                      mode: "numeric",
                    },
                    {
                      key: "street",
                      label: "Rua ou avenida",
                      auto: "address-line1",
                      max: 160,
                    },
                    { key: "number", label: "Número", auto: "off", max: 20 },
                    {
                      key: "complement",
                      label: "Complemento (opcional)",
                      auto: "address-line2",
                      max: 120,
                    },
                    {
                      key: "neighborhood",
                      label: "Bairro",
                      auto: "address-level3",
                      max: 100,
                    },
                    {
                      key: "city",
                      label: "Cidade",
                      auto: "address-level2",
                      max: 100,
                    },
                    {
                      key: "state",
                      label: "UF",
                      auto: "address-level1",
                      max: 2,
                    },
                  ].map((field) => (
                    <label key={field.key} htmlFor={`checkout-${field.key}`}>
                      {field.label}
                      <input
                        id={`checkout-${field.key}`}
                        name={field.key}
                        autoComplete={field.auto}
                        inputMode={
                          field.mode === "numeric" ? "numeric" : "text"
                        }
                        value={address[field.key as keyof Address]}
                        required={field.key !== "complement"}
                        maxLength={field.max}
                        onChange={(e) => {
                          idempotency.current = null;
                          setQuote(null);
                          setAddress({
                            ...address,
                            [field.key]:
                              field.key === "state"
                                ? e.target.value.toUpperCase()
                                : e.target.value,
                          });
                        }}
                      />
                    </label>
                  ))}
                </div>
                <p className="checkout-help">
                  A cobertura, a taxa e o prazo serão conferidos antes do
                  pagamento.
                </p>
              </>
            )}
            {step === 2 && (
              <div className="checkout-review">
                <div>
                  <h3>Identificação</h3>
                  <p>
                    {customer.name}
                    <br />
                    {customer.email}
                    <br />
                    {customer.phone}
                  </p>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => move(0)}
                  >
                    Editar dados
                  </button>
                </div>
                <div>
                  <h3>Endereço de entrega</h3>
                  <p>
                    {address.street}, {address.number}
                    {address.complement && ` · ${address.complement}`}
                    <br />
                    {address.neighborhood} · {address.city} – {address.state}
                    <br />
                    CEP {address.postal_code}
                  </p>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => move(1)}
                  >
                    Editar endereço
                  </button>
                </div>
                <div>
                  <h3>Entrega</h3>
                  {shippingOptions.length > 0 && (
                    <fieldset className="freight-options">
                      <legend>Escolha como receber</legend>
                      <p>
                        Prazo estimado após a postagem. As opções dependem do
                        CEP e dos produtos. A cotação vale por 10 minutos.
                      </p>
                      {shippingOptions.map((option, index) => (
                        <label key={index} className="freight-option">
                          <input
                            type="radio"
                            name="shipping-option"
                            checked={
                              quote?.shipping_token === option.shipping_token
                            }
                            onChange={() => setQuote(option)}
                          />
                          <span>
                            <strong>{option.shipping_service}</strong>
                            <small>{option.delivery_estimate}</small>
                          </span>
                          <strong>{currency(option.shipping_cents)}</strong>
                        </label>
                      ))}
                    </fieldset>
                  )}
                  <p>
                    {quote?.delivery_estimate ||
                      (shippingOptions.length
                        ? "Selecione uma opção de entrega acima."
                        : "Taxa e prazo ainda em configuração. Nenhuma cobrança será realizada.")}
                  </p>
                </div>
                <div>
                  <h3>Pagamento seguro</h3>
                  <p>
                    Você será direcionado ao ambiente de testes do Mercado Pago.
                    A aprovação será confirmada pelo servidor, não pela página
                    de retorno.
                  </p>
                </div>
              </div>
            )}
            <p className="checkout-message" role="alert">
              {message}
            </p>
            <div className="checkout-actions">
              {step > 0 && (
                <button
                  type="button"
                  className="button button-outline"
                  disabled={pending}
                  onClick={() => move(step - 1)}
                >
                  Voltar
                </button>
              )}
              <button
                className="button"
                disabled={pending || (step === 2 && (!paymentReady || !quote))}
              >
                {pending
                  ? "Aguarde…"
                  : step === 0
                    ? "Continuar para entrega"
                    : step === 1
                      ? "Consultar entrega e revisar"
                      : paymentReady && quote
                        ? "Ir para pagamento de teste"
                        : "Compra indisponível"}
              </button>
            </div>
          </section>
        </form>
        <aside className="checkout-summary checkout-panel">
          <h2>Resumo da compra</h2>
          <details className="checkout-items" open={step === 2}>
            <summary>
              Ver itens ({lines.reduce((n, l) => n + l.quantity, 0)})
            </summary>{" "}
            <ul>
              {lines.map((line) => {
                const p = products.find((p) => p.id === line.productId)!;
                const v = p.variants.find((v) => v.id === line.variantId)!;
                const item = quote?.items.find((i) => i.variant_id === v.id);
                return (
                  <li key={v.id}>
                    <div>
                      <strong>{p.name}</strong>
                      <span>
                        {v.label} · {line.quantity} un.
                      </span>
                    </div>
                    <span>
                      {currency(
                        (item?.unit_price_cents ?? v.price) * line.quantity,
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>
          <dl>
            <div>
              <dt>Produtos</dt>
              <dd>
                {currency(quote?.subtotal_cents ?? cartTotal(lines, products))}
              </dd>
            </div>
            <div>
              <dt>Entrega</dt>
              <dd>{quote ? currency(quote.shipping_cents) : "A consultar"}</dd>
            </div>
            <div className="checkout-total">
              <dt>{quote ? "Total" : "Subtotal dos produtos"}</dt>
              <dd>
                {currency(quote?.total_cents ?? cartTotal(lines, products))}
              </dd>
            </div>
          </dl>
          <p>
            Preço e disponibilidade são conferidos no servidor. O estoque só
            será reservado ao criar um pedido de teste.
          </p>
          <Link href="/carrinho" className="text-link">
            Editar carrinho
          </Link>
        </aside>
      </div>
    </div>
  );
}
