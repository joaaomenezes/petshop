"use client";
import { createContext, useContext } from "react";
import type { ShopCatalog } from "@/lib/shop-catalog";
const CatalogContext = createContext<ShopCatalog | null>(null);
export function CatalogProvider({
  value,
  children,
}: {
  value: ShopCatalog;
  children: React.ReactNode;
}) {
  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}
export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error("Catálogo indisponível.");
  return value;
}
