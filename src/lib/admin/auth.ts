import "server-only";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
export async function requireAdmin() {
  if (!supabaseConfig()) throw new Error("Supabase não configurado.");
  const db = await supabaseServer();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw new Error("Sessão inválida. Entre novamente.");
  const role = await db
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (role.error || role.data?.role !== "admin")
    throw new Error("Acesso administrativo não autorizado.");
  return { db, user };
}
export async function guardAdmin() {
  try {
    return await requireAdmin();
  } catch {
    redirect("/admin/login");
  }
}
