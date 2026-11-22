import { Suspense } from "react";
import Catalog from "@/components/catalog/catalog";
export const metadata = { title: "Produtos" };
export default function Page() {
  return (
    <Suspense
      fallback={<p className="container loading">Carregando catálogo…</p>}
    >
      <Catalog />
    </Suspense>
  );
}
