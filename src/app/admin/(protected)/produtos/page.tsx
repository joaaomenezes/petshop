import { getAdminData } from "@/lib/admin/data";
import { ProductList } from "@/components/admin/product-list";
export default async function Page() {
  return <ProductList data={await getAdminData()} />;
}
