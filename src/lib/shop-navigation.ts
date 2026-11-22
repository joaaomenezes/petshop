export type NavigationItem = { label: string; href: string };
const groups = [
  { label: "Rações", names: ["Rações"] },
  { label: "Petiscos", names: ["Petiscos"] },
  { label: "Brinquedos", names: ["Brinquedos"] },
  { label: "Higiene", names: ["Higiene e Limpeza", "Higiene"] },
  { label: "Acessórios", names: ["Acessórios"] },
  { label: "Camas", names: ["Camas e Conforto", "Camas"] },
  { label: "Cuidados", names: ["Cuidados e Beleza", "Cuidados"] },
];
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function catalogLink(
  category?: string,
  species?: string,
  query?: string,
) {
  const params = new URLSearchParams();
  if (species) params.set("especie", species);
  if (category) params.set("categoria", category);
  if (query) params.set("q", query);
  return `/produtos${params.size ? `?${params}` : ""}`;
}
export function shopNavigation(categories: string[], species?: string) {
  const used = new Set<string>();
  const items = groups.map(({ label, names }) => {
    const category = categories.find((c) =>
      names.some((n) => normalize(n) === normalize(c)),
    );
    if (category) used.add(category);
    return {
      label,
      href: catalogLink(category, species, category ? undefined : label),
    };
  });
  const extra = categories
    .filter((c) => !used.has(c) && c !== "Cachorros" && c !== "Gatos")
    .map((c) => ({ label: c, href: catalogLink(c, species) }));
  return { primary: items.slice(0, 5), more: [...items.slice(5), ...extra] };
}
