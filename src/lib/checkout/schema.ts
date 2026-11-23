import { z } from "zod";
const text = (max: number) =>
  z.string().trim().min(1, "Campo obrigatório.").max(max);
export const checkoutItemsSchema = z
  .array(
    z
      .object({
        variant_id: z.uuid(),
        quantity: z.number().int().min(1).max(9999),
      })
      .strict(),
  )
  .min(1)
  .max(50)
  .refine(
    (items) => new Set(items.map((i) => i.variant_id)).size === items.length,
    "Variantes duplicadas.",
  );
export const customerSchema = z
  .object({
    name: text(120).min(2),
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    phone: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .pipe(z.string().regex(/^\d{10,11}$/, "Informe DDD e telefone.")),
  })
  .strict();
export const addressSchema = z
  .object({
    postal_code: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .pipe(z.string().regex(/^\d{8}$/, "Informe um CEP com 8 dígitos.")),
    street: text(160),
    number: text(20),
    complement: z.string().trim().max(120),
    neighborhood: text(100),
    city: text(100),
    state: z.string().regex(/^[A-Z]{2}$/, "Informe a UF."),
  })
  .strict();
export const quoteSchema = z
  .object({ items: checkoutItemsSchema, address: addressSchema })
  .strict();
export const orderSchema = quoteSchema
  .extend({
    customer: customerSchema,
    idempotency_key: z.uuid(),
    shipping_token: z.string().min(1).max(100000).optional(),
    expected_total_cents: z.number().int().positive().max(2147483647),
  })
  .strict();
export const shippingSchema = z
  .object({
    checkout_enabled: z.boolean(),
    city: text(100),
    state: z.string().regex(/^[A-Z]{2}$/),
    fee_cents: z.number().int().min(0).max(1000000).nullable(),
    delivery_estimate: z.string().trim().max(200),
    postal_ranges: z
      .array(
        z
          .object({
            start: z.string().regex(/^\d{8}$/),
            end: z.string().regex(/^\d{8}$/),
          })
          .strict()
          .refine((v) => v.start <= v.end, "Intervalo de CEP inválido."),
      )
      .max(100),
  })
  .refine(
    (v) =>
      !v.checkout_enabled ||
      (v.fee_cents !== null &&
        v.delivery_estimate.length >= 3 &&
        v.postal_ranges.length > 0),
    "Configure taxa, prazo e CEPs antes de habilitar a entrega.",
  );
export type Customer = z.input<typeof customerSchema>;
export type Address = z.input<typeof addressSchema>;
export type ShippingSettings = z.infer<typeof shippingSchema>;
export type Quote = {
  shipping_token?: string;
  shipping_service?: string;
  shipping_expires_at?: string;
  items: {
    variant_id: string;
    product_name: string;
    brand_name: string;
    sku: string;
    label: string;
    unit_price_cents: number;
    quantity: number;
  }[];
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  delivery_estimate: string;
  currency: "BRL";
};
export type Order = Quote & {
  id: string;
  order_number: number;
  shipping_details?: {
    service_name: string;
    carrier: string;
    origin: string;
    destination: string;
    price_cents: number;
  };
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: Address;
  payment_status:
    "pending" | "paid" | "expired" | "review" | "refunded" | "disputed";
  fulfillment_status: "pending" | "processing" | "shipped" | "delivered";
  test_mode: true;
  reservation_active: boolean;
  preference_id: string | null;
  payment_id: string | null;
  created_at: string;
  expires_at: string;
};
export const paymentLabels = {
  pending: "Aguardando pagamento",
  paid: "Pagamento de teste aprovado",
  expired: "Prazo de pagamento encerrado",
  review: "Pagamento em análise administrativa",
  refunded: "Pagamento reembolsado",
  disputed: "Pagamento contestado",
};
export const fulfillmentLabels = {
  pending: "Aguardando separação",
  processing: "Em separação",
  shipped: "Enviado",
  delivered: "Entregue",
};
