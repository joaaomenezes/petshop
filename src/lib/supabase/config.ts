export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url && !key) return null;
  if (!url || !key) throw new Error("Configuração incompleta do Supabase.");
  if (!/^https?:\/\//.test(url)) throw new Error("URL do Supabase inválida.");
  if (key.startsWith("sb_secret_"))
    throw new Error("Use somente a chave publicável do Supabase.");
  if (key.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(
        Buffer.from(key.split(".")[1], "base64url").toString(),
      );
      if (payload.role === "service_role")
        throw new Error(
          "Uma chave service_role não é permitida nesta configuração.",
        );
    } catch (error) {
      if (error instanceof Error && error.message.includes("service_role"))
        throw error;
    }
  }
  return { url, key };
}
