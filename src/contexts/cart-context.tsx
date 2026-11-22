"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { cartKey, readCart, sanitizeCart, type CartLine } from "@/lib/cart";
import { useCatalog } from "./catalog-context";
const Context = createContext<{
  lines: CartLine[];
  ready: boolean;
  add: (id: string, variant: string, quantity: number) => void;
  update: (id: string, variant: string, quantity: number) => void;
}>({ lines: [], ready: false, add: () => {}, update: () => {} });
export function CartProvider({ children }: { children: ReactNode }) {
  const { products } = useCatalog();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setLines(readCart(localStorage, products));
      } catch {
        setLines([]);
      }
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [products]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(cartKey, JSON.stringify(lines));
      } catch {}
  }, [lines, ready]);
  return (
    <Context.Provider
      value={{
        lines: sanitizeCart(lines, products),
        ready,
        add: (id, variant, quantity) =>
          setLines((old) => {
            const found = old.find(
              (l) => l.productId === id && l.variantId === variant,
            );
            return sanitizeCart(
              [
                ...old.filter((l) => l !== found),
                {
                  productId: id,
                  variantId: variant,
                  quantity: quantity + (found?.quantity || 0),
                },
              ],
              products,
            );
          }),
        update: (id, variant, quantity) =>
          setLines((old) =>
            sanitizeCart(
              old.map((l) =>
                l.productId === id && l.variantId === variant
                  ? { ...l, quantity }
                  : l,
              ),
              products,
            ),
          ),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useCart = () => useContext(Context);
