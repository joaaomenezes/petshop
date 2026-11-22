"use client";
import { useId } from "react";
import type { Entity } from "@/lib/admin/schema";

export function ProductCategories({
  categories,
  value,
  onChange,
}: {
  categories: Entity[];
  value: string;
  onChange: (id: string) => void;
}) {
  const hintId = useId();
  const byId = new Map(categories.map((category) => [category.id, category]));
  function ancestry(category: Entity) {
    const path = [category];
    const visited = new Set([category.id]);
    let parent = category.parent_id;
    while (parent && !visited.has(parent)) {
      const ancestor = byId.get(parent);
      if (!ancestor) break;
      path.unshift(ancestor);
      visited.add(parent);
      parent = ancestor.parent_id;
    }
    return path;
  }
  const selected = byId.get(value);
  const rootId = selected ? ancestry(selected)[0].id : "";
  const roots = categories.filter(
    (category) => !category.parent_id || !byId.has(category.parent_id),
  );
  const descendants = rootId
    ? categories
        .filter(
          (category) =>
            category.id !== rootId && ancestry(category)[0].id === rootId,
        )
        .map((category) => ({
          ...category,
          label: ancestry(category)
            .slice(1)
            .map((item) => item.name)
            .join(" › "),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))
    : [];
  return (
    <>
      <label>
        Categoria principal
        <select
          required
          value={rootId}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Selecione a categoria principal</option>
          {roots.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {!category.active ? " (inativa)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        Subcategoria (opcional)
        <select
          value={value !== rootId ? value : ""}
          disabled={!rootId || !descendants.length}
          aria-describedby={hintId}
          onChange={(event) => onChange(event.target.value || rootId)}
        >
          <option value="">
            {!rootId
              ? "Escolha a categoria principal primeiro"
              : !descendants.length
                ? "Nenhuma subcategoria cadastrada"
                : "Sem subcategoria — usar categoria principal"}
          </option>
          {descendants.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
              {!category.active ? " (inativa)" : ""}
            </option>
          ))}
        </select>
        <small id={hintId}>
          Ao escolher uma subcategoria, o produto também aparece na categoria
          principal.
        </small>
      </label>
    </>
  );
}
