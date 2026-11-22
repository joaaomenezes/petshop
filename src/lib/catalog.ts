import { products as demoProducts } from "@/data/products";
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function filterProducts(
  params: URLSearchParams,
  products = demoProducts,
) {
  const q = normalize(params.get("q") || "");
  return products
    .filter(
      (p) =>
        normalize(`${p.name} ${p.brand}`).includes(q) &&
        (!params.get("categoria") || p.category === params.get("categoria")) &&
        (!params.get("especie") ||
          p.species === params.get("especie") ||
          p.species === "Ambos") &&
        (!params.get("marca") || p.brand === params.get("marca")) &&
        p.variants[0].price >= Number(params.get("min") || 0) * 100 &&
        p.variants[0].price <= Number(params.get("max") || 10000) * 100,
    )
    .sort((a, b) =>
      params.get("ordem") === "menor"
        ? a.variants[0].price - b.variants[0].price
        : params.get("ordem") === "maior"
          ? b.variants[0].price - a.variants[0].price
          : params.get("ordem") === "nome"
            ? a.name.localeCompare(b.name, "pt-BR")
            : 0,
    );
}
