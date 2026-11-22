export const subcategoryGroups = [
  {
    parent: "Rações",
    aliases: ["Rações", "Rações e Alimentação"],
    children: [
      ["Rações Secas", "racoes-secas"],
      ["Rações Úmidas", "racoes-umidas"],
      ["Sachês", "saches"],
    ],
  },
  {
    parent: "Petiscos",
    aliases: ["Petiscos"],
    children: [
      ["Bifinhos", "bifinhos"],
      ["Biscoitos", "biscoitos"],
      ["Petiscos Naturais", "petiscos-naturais"],
      ["Ossinhos e Mastigáveis", "ossinhos-mastigaveis"],
    ],
  },
  {
    parent: "Brinquedos",
    aliases: ["Brinquedos"],
    children: [
      ["Bolinhas", "bolinhas"],
      ["Mordedores", "mordedores"],
      ["Pelúcias", "pelucias"],
      ["Brinquedos Interativos", "brinquedos-interativos"],
      ["Arranhadores", "arranhadores"],
    ],
  },
  {
    parent: "Acessórios",
    aliases: ["Acessórios"],
    children: [
      ["Coleiras", "coleiras"],
      ["Guias e Peitorais", "guias-peitorais"],
      ["Comedouros", "comedouros"],
      ["Bebedouros", "bebedouros"],
      ["Transporte", "transporte"],
    ],
  },
  {
    parent: "Higiene e Limpeza",
    aliases: ["Higiene e Limpeza", "Higiene"],
    children: [
      ["Areias Sanitárias", "areias-sanitarias"],
      ["Tapetes Higiênicos", "tapetes-higienicos"],
      ["Shampoos", "shampoos"],
      ["Lenços Umedecidos", "lencos-umedecidos"],
      ["Limpeza de Ambientes", "limpeza-ambientes"],
    ],
  },
  {
    parent: "Camas e Conforto",
    aliases: ["Camas e Conforto", "Camas"],
    children: [
      ["Caminhas", "caminhas"],
      ["Mantas e Cobertores", "mantas-cobertores"],
      ["Casinhas", "casinhas"],
      ["Colchonetes", "colchonetes"],
    ],
  },
  {
    parent: "Cuidados",
    aliases: ["Cuidados", "Cuidados e Beleza"],
    children: [
      ["Escovas e Pentes", "escovas-pentes"],
      ["Cortadores de Unhas", "cortadores-unhas"],
      ["Cuidados com a Pelagem", "cuidados-pelagem"],
    ],
  },
] as const;
export type CategoryRow = {
  id: string;
  name: string;
  slug?: string;
  parent_id?: string | null;
  active: boolean;
};
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export function planSubcategories(existing: CategoryRow[]) {
  const missing: {
    name: string;
    slug: string;
    parent_id: string;
    active: boolean;
  }[] = [];
  let present = 0;
  for (const group of subcategoryGroups) {
    const parents = existing.filter(
      (c) =>
        !c.parent_id &&
        group.aliases.some((alias) => normalize(alias) === normalize(c.name)),
    );
    if (parents.length !== 1 || !parents[0].active)
      throw Error(
        `Confira a categoria pai ${group.parent}: deve existir uma única categoria raiz ativa.`,
      );
    const parent = parents[0];
    for (const [name, slug] of group.children) {
      const match = existing.find((c) => c.slug === slug);
      if (match) {
        if (
          match.parent_id !== parent.id ||
          normalize(match.name) !== normalize(name)
        )
          throw Error(
            `O slug ${slug} já está em uso com outro nome ou categoria pai. Nenhum registro foi importado.`,
          );
        present++;
      } else {
        if (existing.some((c) => normalize(c.name) === normalize(name)))
          throw Error(
            `${name} já existe com outro slug. Confira o cadastro antes de importar.`,
          );
        missing.push({ name, slug, parent_id: parent.id, active: true });
      }
    }
  }
  return { missing, present, total: missing.length + present };
}
