import { products } from "./products";
export const brands = [...new Set(products.map((p) => p.brand))];
