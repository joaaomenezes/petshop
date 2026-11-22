"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireAdmin } from "./auth";
import {
  entitySchema,
  productSchema,
  inventorySchema,
  settingsSchema,
  imageExtension,
  imageMaxSize,
} from "./schema";
export type Result = {
  ok: boolean;
  message: string;
  id?: string;
  path?: string;
  preview?: string;
};
function errorMessage(error: unknown) {
  if (error instanceof z.ZodError)
    return error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .slice(0, 4)
      .join(" ");
  if (error && typeof error === "object" && "code" in error) {
    const code = String(error.code);
    if (code === "23505")
      return "SKU ou slug já cadastrado. Verifique os valores.";
    if (code === "23503")
      return "Registro vinculado a outros dados. Desative-o em vez de excluir.";
    if (code === "42501")
      return "Permissão negada. Entre com uma conta administrativa.";
    if (
      "message" in error &&
      typeof error.message === "string" &&
      /Estoque|estoque|Motivo|alterado|Variante|Use o controle|Imagem/.test(
        error.message,
      )
    )
      return error.message;
    return "Não foi possível salvar. Verifique os dados e a conexão.";
  }
  return error instanceof Error ? error.message : "Operação não concluída.";
}
export async function login(
  _previous: Result,
  data: FormData,
): Promise<Result> {
  try {
    if (!supabaseConfig())
      return {
        ok: false,
        message: "Supabase não configurado. Consulte a documentação.",
      };
    const values = z
      .object({ email: z.email(), password: z.string().min(1).max(200) })
      .parse(Object.fromEntries(data));
    const db = await supabaseServer();
    const response = await db.auth.signInWithPassword(values);
    if (response.error)
      return {
        ok: false,
        message: "Não foi possível entrar. Verifique suas credenciais.",
      };
    try {
      await requireAdmin();
    } catch {
      await db.auth.signOut();
      return {
        ok: false,
        message: "Esta conta não tem acesso administrativo.",
      };
    }
  } catch {
    return {
      ok: false,
      message:
        "Não foi possível entrar. Verifique a configuração e tente novamente.",
    };
  }
  redirect("/admin");
}
export async function logout() {
  const db = await supabaseServer();
  await db.auth.signOut();
  redirect("/admin/login");
}
export async function saveProduct(input: unknown): Promise<Result> {
  try {
    const { db } = await requireAdmin();
    const payload = productSchema.parse(input);
    const previous = await db
      .from("product_images")
      .select("storage_path")
      .eq("product_id", payload.id);
    if (previous.error) throw previous.error;
    const response = await db.rpc("save_product", { payload });
    if (response.error) throw response.error;
    const removed = (previous.data || [])
      .filter(
        (image) =>
          !payload.images.some((i) => i.storage_path === image.storage_path),
      )
      .map((i) => i.storage_path);
    let cleanupFailed = false;
    if (removed.length) {
      const cleanup = await db.storage.from("product-images").remove(removed);
      cleanupFailed = !!cleanup.error;
    }
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: cleanupFailed
        ? "Produto salvo. Alguns arquivos antigos não puderam ser removidos do Storage."
        : "Produto salvo com sucesso.",
      id: String(response.data),
    };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}
export async function saveEntity(
  kind: string,
  input: unknown,
): Promise<Result> {
  try {
    const { db } = await requireAdmin();
    const table = z.enum(["marcas", "categorias", "fornecedores"]).parse(kind);
    const entity = entitySchema.parse(input);
    const payload: Record<string, unknown> =
      table === "fornecedores"
        ? {
            id: entity.id,
            name: entity.name,
            contact_info: entity.contact_info || "",
            active: entity.active,
          }
        : {
            id: entity.id,
            name: entity.name,
            slug: entity.slug,
            active: entity.active,
            ...(table === "categorias"
              ? { parent_id: entity.parent_id || null }
              : {}),
          };
    if (table !== "fornecedores" && !entity.slug)
      throw new Error("Slug obrigatório.");
    const response = await db
      .from(
        {
          marcas: "brands",
          categorias: "categories",
          fornecedores: "suppliers",
        }[table],
      )
      .upsert(payload);
    if (response.error) throw response.error;
    revalidatePath("/", "layout");
    return { ok: true, message: "Registro salvo." };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}
export async function removeEntity(kind: string, id: string): Promise<Result> {
  try {
    const { db } = await requireAdmin();
    const table = z.enum(["marcas", "categorias", "fornecedores"]).parse(kind);
    z.uuid().parse(id);
    const response = await db
      .from(
        {
          marcas: "brands",
          categorias: "categories",
          fornecedores: "suppliers",
        }[table],
      )
      .delete()
      .eq("id", id);
    if (response.error) throw response.error;
    revalidatePath("/", "layout");
    return { ok: true, message: "Registro excluído." };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}
export async function adjustStock(input: unknown): Promise<Result> {
  try {
    const { db } = await requireAdmin();
    const data = inventorySchema.parse(input);
    const response = await db.rpc("adjust_inventory", {
      p_variant_id: data.variant_id,
      p_type: data.type,
      p_quantity: data.quantity,
      p_reason: data.reason,
    });
    if (response.error) throw response.error;
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: `Movimentação registrada. Novo saldo: ${response.data}.`,
    };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}
export async function saveSettings(input: unknown): Promise<Result> {
  try {
    const { db } = await requireAdmin();
    const data = settingsSchema.parse(input);
    const response = await db
      .from("store_settings")
      .update(data)
      .eq("id", true);
    if (response.error) throw response.error;
    revalidatePath("/", "layout");
    return { ok: true, message: "Configurações salvas." };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}
export async function uploadImage(data: FormData): Promise<Result> {
  try {
    const { db, user } = await requireAdmin();
    const file = data.get("image");
    if (!(file instanceof File) || file.size === 0 || file.size > imageMaxSize)
      throw new Error("Use uma imagem de até 5 MB.");
    const ext = imageExtension(
      new Uint8Array(await file.arrayBuffer()),
      file.type,
    );
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const result = await db.storage
      .from("product-images")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (result.error) throw result.error;
    const signed = await db.storage
      .from("product-images")
      .createSignedUrl(path, 3600);
    if (signed.error) throw signed.error;
    return {
      ok: true,
      message: "Imagem enviada. Salve o produto para publicar.",
      path,
      preview: signed.data.signedUrl,
    };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}
export async function removeUnusedImage(path: string): Promise<Result> {
  try {
    const { db } = await requireAdmin();
    z.string()
      .regex(/^[a-zA-Z0-9/-]+\.(jpg|png|webp)$/)
      .parse(path);
    const response = await db.storage.from("product-images").remove([path]);
    if (response.error) throw response.error;
    return { ok: true, message: "Arquivo não utilizado removido." };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}
