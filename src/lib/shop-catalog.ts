import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { products as demoProducts } from "@/data/products";
import { categories as demoCategories } from "@/data/categories";
import { brand } from "@/config/brand";
import type { Product } from "@/types/product";
export type ShopCatalog = {
  products: Product[];
  categories: string[];
  brands: string[];
  demo: boolean;
  name: string;
  slogan: string;
};
export const getCatalog = cache(async (): Promise<ShopCatalog> => {
  const config = supabaseConfig();
  if (!config)
    return {
      products: demoProducts,
      categories: demoCategories,
      brands: [...new Set(demoProducts.map((p) => p.brand))],
      demo: true,
      name: brand.name,
      slogan: brand.slogan,
    };
  // Anonymous server client: never fetch cost or private administrator data.
  const db = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
    },
  });
  const [p, v, i, b, c, s] = await Promise.all([
    db
      .from("products")
      .select("id,name,slug,description,brand_id,category_id,species,featured")
      .eq("active", true),
    db
      .from("product_variants")
      .select("id,product_id,sku,label,price_cents,weight_grams,stock_quantity")
      .eq("active", true)
      .order("created_at"),
    db
      .from("product_images")
      .select("product_id,storage_path,alt_text,sort_order")
      .order("sort_order"),
    db.from("brands").select("id,name").eq("active", true),
    db.from("categories").select("id,name").eq("active", true),
    db.from("store_settings").select("name,slogan").single(),
  ]);
  for (const r of [p, v, i, b, c, s])
    if (r.error)
      throw new Error(
        "Não foi possível carregar o catálogo. Tente novamente em instantes.",
      );
  const mapped: Product[] = await Promise.all(
    (p.data || [])
      .filter((row) =>
        (v.data || []).some((variant) => variant.product_id === row.id),
      )
      .map(async (row) => {
        const images = await Promise.all(
          (i.data || [])
            .filter((img) => img.product_id === row.id)
            .map(async (img) => {
              const signed = await db.storage
                .from("product-images")
                .createSignedUrl(img.storage_path, 3600);
              if (signed.error)
                throw new Error("Não foi possível carregar as imagens.");
              return { url: signed.data.signedUrl, alt: img.alt_text };
            }),
        );
        return {
          id: row.id,
          name: row.name,
          slug: row.slug,
          description: row.description,
          brand: b.data!.find((x) => x.id === row.brand_id)?.name || "",
          category: c.data!.find((x) => x.id === row.category_id)?.name || "",
          species: row.species,
          featured: row.featured,
          images: images.length
            ? images.map((x) => x.url)
            : ["/images/product-placeholder.svg"],
          imageAlts: images.map((x) => x.alt),
          variants: v
            .data!.filter((x) => x.product_id === row.id)
            .map((x) => ({
              id: x.id,
              label: x.label,
              sku: x.sku,
              price: x.price_cents,
              weight: x.weight_grams,
              stock: x.stock_quantity,
            })),
        };
      }),
  );
  return {
    products: mapped,
    categories: (c.data || []).map((x) => x.name),
    brands: (b.data || []).map((x) => x.name),
    demo: false,
    name: s.data?.name || brand.name,
    slogan: s.data?.slogan || brand.slogan,
  };
});
