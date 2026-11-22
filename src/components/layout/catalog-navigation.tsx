"use client";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef } from "react";
import { useCatalog } from "@/contexts/catalog-context";
import {
  catalogLink,
  shopNavigation,
  type NavigationItem,
} from "@/lib/shop-navigation";
function Dropdown({
  label,
  groups,
}: {
  label: string;
  groups: { title: string; items: NavigationItem[] }[];
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node))
        ref.current?.removeAttribute("open");
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <details
      ref={ref}
      className="catalog-dropdown"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          event.currentTarget.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary>
        {label}
        <ChevronDown size={15} />
      </summary>
      <div
        className="catalog-dropdown-panel"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a"))
            ref.current?.removeAttribute("open");
        }}
      >
        {groups.map((group) => (
          <section key={group.title}>
            <h2>{group.title}</h2>
            {group.items.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
          </section>
        ))}
      </div>
    </details>
  );
}
export function CatalogNavigation() {
  const { categories: allCategories, rootCategories } = useCatalog();
  const categories = rootCategories ?? allCategories;
  const navigation = shopNavigation(categories);
  return (
    <nav
      className="container desktop-nav shop-navigation"
      aria-label="Categorias"
    >
      {["Cachorros", "Gatos"].map((species) => {
        const pet = shopNavigation(categories, species);
        return (
          <Dropdown
            key={species}
            label={species}
            groups={[
              {
                title: "Alimentação",
                items: [
                  {
                    label: `Tudo para ${species.toLowerCase()}`,
                    href: catalogLink(undefined, species),
                  },
                  ...pet.primary.slice(0, 2),
                ],
              },
              {
                title: "Cuidados e acessórios",
                items: [...pet.primary.slice(2), ...pet.more],
              },
            ]}
          />
        );
      })}
      {navigation.primary.map((item) => (
        <Link key={item.label} href={item.href}>
          {item.label}
        </Link>
      ))}
      <Dropdown
        label="Mais"
        groups={[
          {
            title: "Explore o catálogo",
            items: [
              ...navigation.more,
              { label: "Todos os produtos", href: "/produtos" },
            ],
          },
        ]}
      />
    </nav>
  );
}
export function CategoriesDirectory() {
  const { categories: allCategories, rootCategories } = useCatalog();
  const categories = rootCategories ?? allCategories;
  const navigation = shopNavigation(categories);
  return (
    <div className="container categories-directory">
      <span className="eyebrow">ENCONTRE O QUE SEU PET PRECISA</span>
      <h1>Explore a loja</h1>
      <p>Comece pelo seu pet ou escolha uma categoria.</p>
      <section>
        <h2>Para o seu pet</h2>
        <div className="pet-category-links">
          {["Cachorros", "Gatos"].map((pet) => (
            <Link key={pet} href={catalogLink(undefined, pet)}>
              {pet}
              <span>Ver produtos →</span>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2>Alimentação</h2>
        <DirectoryLinks items={navigation.primary.slice(0, 2)} />
      </section>
      <section>
        <h2>Cuidados e acessórios</h2>
        <DirectoryLinks
          items={[...navigation.primary.slice(2), ...navigation.more]}
        />
      </section>
      <Link className="button button-primary" href="/produtos">
        Ver todos os produtos
      </Link>
    </div>
  );
}
function DirectoryLinks({ items }: { items: NavigationItem[] }) {
  return (
    <div className="directory-links">
      {items.map((item) => (
        <Link key={item.label} href={item.href}>
          {item.label}
          <span aria-hidden="true">→</span>
        </Link>
      ))}
    </div>
  );
}
