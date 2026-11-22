"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importSubcategories } from "@/lib/admin/subcategory-actions";
import {
  planSubcategories,
  subcategoryGroups,
  type CategoryRow,
} from "@/lib/admin/subcategories";
export function SubcategoryImport({
  categories,
}: {
  categories: CategoryRow[];
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const router = useRouter();
  let count = 0,
    problem = "";
  try {
    count = planSubcategories(categories).missing.length;
  } catch (error) {
    problem =
      error instanceof Error ? error.message : "Confira as categorias pai.";
  }
  return (
    <section className="admin-panel">
      <h2>Importar subcategorias da Pet Piraju</h2>
      <p>
        A lista tem 29 subcategorias em sete grupos. A importação cria somente
        as que faltam, com os slugs definidos e a categoria pai correspondente.
      </p>
      <details>
        <summary>Conferir nomes e slugs</summary>
        {subcategoryGroups.map((group) => (
          <section key={group.parent}>
            <h3>{group.parent}</h3>
            <ul>
              {group.children.map(([name, slug]) => (
                <li key={slug}>
                  {name} — <code>{slug}</code>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </details>
      {problem && <p role="alert">{problem}</p>}
      <button
        type="button"
        className="button"
        disabled={pending || !!problem || count === 0}
        onClick={() =>
          start(async () => {
            const result = await importSubcategories();
            setMessage(result.message);
            if (result.ok) router.refresh();
          })
        }
      >
        {pending
          ? "Importando…"
          : count
            ? `Importar ${count} subcategorias`
            : "Subcategorias já cadastradas"}
      </button>
      <p role="status">{message}</p>
    </section>
  );
}
