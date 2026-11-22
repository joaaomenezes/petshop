"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { shippingSchema } from "./schema";
import { z } from "zod";
export async function updateShipping(input: unknown) {
  try {
    const { db } = await requireAdmin();
    const data = shippingSchema.parse(input);
    const result = await db
      .from("shipping_settings")
      .update(data)
      .eq("id", true)
      .select("id")
      .single();
    if (result.error) throw result.error;
    revalidatePath("/", "layout");
    return {
      ok: true,
      message:
        "Regras de entrega salvas. O pagamento continua dependendo da configuração de testes.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof z.ZodError
          ? error.issues[0].message
          : "Não foi possível salvar. Verifique a sessão e a migration do checkout.",
    };
  }
}
export async function fulfillOrder(id: string, status: string) {
  try {
    const { db } = await requireAdmin();
    z.uuid().parse(id);
    z.enum(["processing", "shipped", "delivered"]).parse(status);
    const result = await db.rpc("admin_fulfill_order", {
      p_id: id,
      p_status: status,
    });
    if (result.error) throw result.error;
    revalidatePath("/admin/pedidos", "layout");
    return { ok: true, message: "Etapa de entrega atualizada." };
  } catch {
    return {
      ok: false,
      message:
        "Não foi possível atualizar. Somente pedidos pagos podem avançar, uma etapa por vez.",
    };
  }
}
