import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/supabase/config";
export const sessionCookie = "pet-checkout-session";
export function checkoutReadiness() {
  const reasons: string[] = [];
  if (process.env.CHECKOUT_MODE !== "test")
    reasons.push("Checkout em ambiente de testes ainda não habilitado.");
  const config = supabaseConfig();
  if (!config) reasons.push("Banco de dados não configurado.");
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key)
    reasons.push("Credencial privada do servidor ainda não configurada.");
  if (!/^(TEST-|APP_USR-)/.test(process.env.MERCADO_PAGO_ACCESS_TOKEN || ""))
    reasons.push("Credencial de testes do pagamento ainda não configurada.");
  if (
    !process.env.MERCADO_PAGO_WEBHOOK_SECRET ||
    !process.env.MERCADO_PAGO_COLLECTOR_ID
  )
    reasons.push("Notificações de pagamento ainda não configuradas.");
  const base = process.env.CHECKOUT_BASE_URL;
  try {
    const url = new URL(base || "");
    if (
      url.protocol !== "https:" ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.username ||
      url.password ||
      url.pathname !== "/"
    )
      throw Error();
  } catch {
    reasons.push("Endereço HTTPS público do checkout ainda não configurado.");
  }
  if (
    !process.env.CHECKOUT_CRON_SECRET ||
    process.env.CHECKOUT_CRON_SECRET.length < 32 ||
    process.env.CHECKOUT_EXPIRATION_JOB_READY !== "true"
  )
    reasons.push("Liberação automática de reservas ainda não configurada.");
  return { ready: reasons.length === 0, reasons };
}
export function checkoutService() {
  const config = supabaseConfig();
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !key) throw Error("Integração do servidor não configurada.");
  return createClient(config.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
    },
  });
}
export function publicCheckoutClient() {
  const config = supabaseConfig();
  if (!config) return null;
  return createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
    },
  });
}
export async function sessionHash(create = false) {
  const jar = await cookies();
  let token = jar.get(sessionCookie)?.value;
  if (!token || !/^\w{64}$/.test(token)) {
    if (!create) return null;
    token = randomBytes(32).toString("hex");
    jar.set(sessionCookie, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });
  }
  return createHash("sha256").update(token).digest("hex");
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const target = new URL(request.url);
  return (
    !!origin &&
    (origin === target.origin ||
      origin === process.env.CHECKOUT_BASE_URL?.replace(/\/$/, ""))
  );
}
export async function readBody(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 30000)
    throw Error("Requisição muito grande.");
  const text = await request.text();
  if (text.length > 30000) throw Error("Requisição muito grande.");
  return JSON.parse(text);
}
export function safeCheckoutError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  if (
    /Valores atualizados|Entrega ainda|fora da área|estoque insuficiente|Carrinho inválido|Quantidade inválida|Variantes duplicadas|Valor do carrinho|Limite de tentativas|Pedido expirado|Requisição diferente/.test(
      message,
    )
  )
    return message;
  return "Não foi possível concluir esta etapa. Tente novamente.";
}
