import type { Product } from "@/types/product";
const entries = [
  [
    "Ração natural para cães adultos",
    "Raíza",
    "Rações",
    "Cachorros",
    8990,
    "3 kg",
  ],
  ["Ração equilibrada para gatos", "Raíza", "Rações", "Gatos", 6490, "1 kg"],
  [
    "Areia vegetal de mandioca",
    "Terra Mansa",
    "Areia sanitária",
    "Gatos",
    3990,
    "2 kg",
  ],
  [
    "Biscoitos de abóbora e aveia",
    "Bento",
    "Petiscos",
    "Cachorros",
    2290,
    "200 g",
  ],
  [
    "Shampoo suave de camomila",
    "Folha",
    "Higiene",
    "Cachorros",
    3290,
    "500 ml",
  ],
  [
    "Brinquedo corda de algodão",
    "Casa Pet",
    "Brinquedos",
    "Cachorros",
    2490,
    "M",
  ],
  ["Ração para cães filhotes", "Raíza", "Rações", "Cachorros", 9490, "3 kg"],
  ["Ração para gatos castrados", "Raíza", "Rações", "Gatos", 7990, "1 kg"],
  [
    "Areia mineral sem perfume",
    "Terra Mansa",
    "Areia sanitária",
    "Gatos",
    2990,
    "4 kg",
  ],
  ["Petisco crocante de salmão", "Bento", "Petiscos", "Gatos", 1890, "60 g"],
  [
    "Tapete higiênico absorvente",
    "Folha",
    "Higiene",
    "Cachorros",
    5990,
    "30 un.",
  ],
  ["Escova de cerdas macias", "Casa Pet", "Higiene", "Ambos", 3490, "Único"],
  [
    "Bolinha de borracha natural",
    "Casa Pet",
    "Brinquedos",
    "Cachorros",
    1990,
    "P",
  ],
  [
    "Varinha com fita de algodão",
    "Casa Pet",
    "Brinquedos",
    "Gatos",
    2790,
    "Único",
  ],
  [
    "Comedouro de cerâmica areia",
    "Casa Pet",
    "Acessórios",
    "Ambos",
    6990,
    "400 ml",
  ],
  [
    "Guia de passeio verde floresta",
    "Casa Pet",
    "Acessórios",
    "Cachorros",
    5490,
    "1,2 m",
  ],
  ["Cama de linho natural", "Casa Pet", "Acessórios", "Ambos", 18990, "M"],
  [
    "Arranhador de fibra natural",
    "Casa Pet",
    "Acessórios",
    "Gatos",
    11990,
    "Único",
  ],
] as const;
export const products: Product[] = entries.map(
  ([name, brand, category, species, price, label], i) => ({
    id: `p${i + 1}`,
    slug: name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replaceAll(" ", "-"),
    name,
    brand,
    category,
    species,
    description:
      "Uma escolha cuidadosa para a rotina do seu pet. Produto e marca fictícios, apresentados exclusivamente para demonstrar a experiência da loja. Composição, uso e disponibilidade serão confirmados no catálogo definitivo.",
    images: [
      `/images/products/product-${i + 1}.svg`,
      `/images/products/product-${i + 1}-detail.svg`,
    ],
    variants: [
      {
        id: "base",
        label,
        price,
        stock: i === 17 ? 0 : 12,
        sku: `DEMO-${i + 1}-01`,
        weight: label.endsWith("kg")
          ? Number.parseFloat(label.replace(",", ".")) * 1000
          : label.endsWith("g")
            ? Number.parseFloat(label)
            : 1000,
      },
      ...(category === "Rações"
        ? [
            {
              id: "large",
              label: "10 kg",
              price: price * 3,
              stock: 5,
              sku: `DEMO-${i + 1}-02`,
              weight: 10000,
            },
          ]
        : []),
    ],
  }),
);
