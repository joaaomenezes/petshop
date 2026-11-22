import { notFound } from "next/navigation";
import { getAdminData } from "@/lib/admin/data";
import { ProductEditor } from "@/components/admin/product-editor";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const data = await getAdminData();
  const product = data.products.find((p) => p.id === id);
  if (!product) notFound();
  return (
    <ProductEditor
      key={product.updated_at}
      data={data}
      notice={
        saved === "1"
          ? "Produto salvo com sucesso."
          : saved === "cleanup"
            ? "Produto salvo. Alguns arquivos antigos não puderam ser removidos do Storage."
            : ""
      }
      initial={{
        ...product,
        images: data.images.filter((i) => i.product_id === id),
        variants: data.variants
          .filter((v) => v.product_id === id)
          .map((v) => ({ ...v, barcode: v.barcode || "" })),
      }}
    />
  );
}
