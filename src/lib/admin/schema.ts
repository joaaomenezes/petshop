import { z } from "zod";
const name = z.string().trim().min(1).max(200);
const uuid = z.uuid();
const integer = z.number().int().min(0).max(2147483647);
export const slugSchema = z
  .string()
  .min(1)
  .max(220)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use letras minúsculas, números e hífens.",
  );
export const variantSchema = z.object({
  id: uuid,
  label: name.max(80),
  sku: name.max(80),
  barcode: z.string().regex(/^(?:[0-9]{8,14})?$/),
  price_cents: integer,
  cost_cents: integer,
  weight_grams: integer,
  stock_quantity: integer,
  min_stock_quantity: integer,
  active: z.boolean(),
});
export const imageSchema = z.object({
  storage_path: z
    .string()
    .max(500)
    .regex(/^[a-zA-Z0-9/-]+\.(jpg|png|webp)$/),
  alt_text: name.max(300),
  sort_order: integer,
});
export const productSchema = z
  .object({
    id: uuid,
    updated_at: z.string().nullable(),
    name,
    slug: slugSchema,
    brand_id: uuid,
    category_id: uuid,
    species: z.enum(["Cachorros", "Gatos", "Ambos"]),
    description: z.string().max(20000),
    active: z.boolean(),
    featured: z.boolean(),
    variants: z.array(variantSchema).min(1).max(30),
    images: z.array(imageSchema).max(12),
  })
  .superRefine((data, ctx) => {
    if (
      new Set(data.variants.map((v) => v.sku.toLowerCase())).size !==
      data.variants.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Os SKUs devem ser únicos.",
        path: ["variants"],
      });
    if (new Set(data.variants.map((v) => v.id)).size !== data.variants.length)
      ctx.addIssue({ code: "custom", message: "Variantes duplicadas." });
  });
export const entitySchema = z.object({
  id: uuid.optional(),
  name: name.max(120),
  slug: slugSchema.optional(),
  parent_id: uuid.nullable().optional(),
  contact_info: z.string().max(2000).optional(),
  active: z.boolean(),
});
export const inventorySchema = z.object({
  variant_id: uuid,
  type: z.enum(["entrada", "saida"]),
  quantity: z.number().int().positive().max(2147483647),
  reason: z.string().trim().min(3).max(500),
});
export const settingsSchema = z.object({
  name: name.max(80),
  slogan: z.string().trim().max(160),
});
export type ProductInput = z.infer<typeof productSchema>;
export type Entity = {
  id: string;
  name: string;
  slug?: string;
  active: boolean;
  parent_id?: string | null;
  contact_info?: string;
};
export type AdminVariant = z.infer<typeof variantSchema> & {
  product_id: string;
  reserved_quantity?: number;
};
export type AdminProduct = Omit<ProductInput, "variants" | "images"> & {
  created_at: string;
};
export type AdminImage = z.infer<typeof imageSchema> & {
  id: string;
  product_id: string;
  preview?: string;
};
export type Movement = {
  id: string;
  variant_id: string;
  type: string;
  quantity: number;
  reason: string;
  created_at: string;
  created_by: string | null;
  actor_kind?: "admin" | "system";
  order_id?: string | null;
};
export type AdminData = {
  products: AdminProduct[];
  variants: AdminVariant[];
  images: AdminImage[];
  brands: Entity[];
  categories: Entity[];
  suppliers: Entity[];
  movements: Movement[];
  settings: { name: string; slogan: string };
};
export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export const imageMaxSize = 5 * 1024 * 1024;
export function imageExtension(bytes: Uint8Array, mime: string) {
  if (
    mime === "image/jpeg" &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return "jpg";
  if (
    mime === "image/png" &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)
  )
    return "png";
  if (
    mime === "image/webp" &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "webp";
  throw new Error("Imagem inválida. Use JPEG, PNG ou WebP.");
}
