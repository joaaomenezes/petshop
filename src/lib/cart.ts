import { products } from "@/data/products";
export type CartLine = {
  productId: string;
  variantId: string;
  quantity: number;
};
export const cartKey = "pet-piraju:cart:v1";
export function sanitizeCart(value: unknown, catalog = products): CartLine[] {
  if (!Array.isArray(value)) return [];
  const result: CartLine[] = [];
  for (const line of value) {
    const p = catalog.find((p) => p.id === line?.productId);
    const v = p?.variants.find((v) => v.id === line.variantId);
    if (
      !p ||
      !v ||
      !Number.isInteger(line.quantity) ||
      line.quantity <= 0 ||
      !v.stock
    )
      continue;
    const existing = result.find(
      (l) => l.productId === p.id && l.variantId === v.id,
    );
    if (existing)
      existing.quantity = Math.min(v.stock, existing.quantity + line.quantity);
    else
      result.push({
        productId: p.id,
        variantId: v.id,
        quantity: Math.min(v.stock, line.quantity),
      });
  }
  return result;
}
export const cartTotal = (lines: CartLine[], catalog = products) =>
  lines.reduce(
    (sum, l) =>
      sum +
      (catalog
        .find((p) => p.id === l.productId)
        ?.variants.find((v) => v.id === l.variantId)?.price || 0) *
        l.quantity,
    0,
  );
export function readCart(
  storage: Pick<Storage, "getItem">,
  catalog = products,
) {
  try {
    return sanitizeCart(JSON.parse(storage.getItem(cartKey) || "[]"), catalog);
  } catch {
    return [];
  }
}
