import { getCatalog } from "@/lib/shop-catalog";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/product/product-detail";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { products } = await getCatalog();
  const p = products.find((p) => p.slug === slug);
  return {
    title: p?.name || "Produto não encontrado",
    description: p?.description,
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { products } = await getCatalog();
  const p = products.find((p) => p.slug === slug);
  if (!p) notFound();
  return <ProductDetail product={p} />;
}
