export type Variant = {
  id: string;
  label: string;
  price: number;
  stock: number;
  sku: string;
  weight: number;
};
export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  species: string;
  description: string;
  images: string[];
  imageAlts?: string[];
  featured?: boolean;
  variants: Variant[];
};
