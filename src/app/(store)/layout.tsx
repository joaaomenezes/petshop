import { getCatalog } from "@/lib/shop-catalog";
import { CatalogProvider } from "@/contexts/catalog-context";
import { CartProvider } from "@/contexts/cart-context";
import { SiteHeader, SiteFooter } from "@/components/layout/site-shell";
export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const catalog = await getCatalog();
  return (
    <CatalogProvider value={catalog}>
      <CartProvider>
        <a href="#conteudo" className="skip-link">
          Pular para conteúdo
        </a>
        <SiteHeader />
        <main id="conteudo">{children}</main>
        <SiteFooter />
      </CartProvider>
    </CatalogProvider>
  );
}
