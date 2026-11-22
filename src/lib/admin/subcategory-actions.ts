"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth";
import { planSubcategories } from "./subcategories";
export async function importSubcategories() {
  try {
    const { db } = await requireAdmin();
    const current = await db
      .from("categories")
      .select("id,name,slug,parent_id,active");
    if (current.error)
      return {
        ok: false,
        message: "Não foi possível consultar as categorias. Tente novamente.",
      };
    const plan = planSubcategories(current.data);
    if (plan.missing.length) {
      // A single SQL INSERT: a collision or permission error rolls back the entire batch.
      const result = await db
        .from("categories")
        .insert(plan.missing)
        .select("id");
      if (result.error)
        return {
          ok: false,
          message:
            "O lote não foi salvo. Nenhuma categoria desta tentativa foi criada. Atualize a página e confira possíveis slugs duplicados.",
        };
    }
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: plan.missing.length
        ? `${plan.missing.length} subcategorias cadastradas; ${plan.present} já existiam. Categorias pai e produtos preservados.`
        : "As 29 subcategorias já estão cadastradas. Nenhum registro duplicado.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível importar as subcategorias.",
    };
  }
}
