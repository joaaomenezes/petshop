import { getAdminData } from "@/lib/admin/data";
import { ProductEditor } from "@/components/admin/product-editor";
export default async function Page() {
  const data = await getAdminData();
  return (
    <ProductEditor
      data={data}
      initial={{
        id: crypto.randomUUID(),
        updated_at: null,
        name: "",
        slug: "",
        brand_id: "",
        category_id: "",
        species: "Cachorros",
        description: "",
        active: true,
        featured: false,
        images: [],
        variants: [
          {
            id: crypto.randomUUID(),
            label: "",
            sku: "",
            barcode: "",
            price_cents: 0,
            cost_cents: 0,
            weight_grams: 0,
            stock_quantity: 0,
            min_stock_quantity: 5,
            active: true,
          },
        ],
      }}
    />
  );
}
