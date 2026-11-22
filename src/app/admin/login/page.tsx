import Link from "next/link";
import { LoginForm } from "@/components/admin/login-form";
import { supabaseConfig } from "@/lib/supabase/config";
export const dynamic = "force-dynamic";
export default function LoginPage() {
  let configured = false;
  let error = "";
  try {
    configured = !!supabaseConfig();
  } catch {
    error = "A configuração do Supabase está incompleta ou inválida.";
  }
  return (
    <main className="admin-login">
      <Link href="/" className="logo">
        Pet Piraju.
      </Link>
      <span className="eyebrow">ACESSO RESTRITO</span>
      <h1>Bem-vindo ao painel.</h1>
      <p>Entre com uma conta autorizada para administrar o catálogo.</p>
      {!configured && (
        <div className="admin-notice">
          <strong>{error || "Supabase ainda não configurado."}</strong>
          <p>
            A loja permanece em modo demonstração. Configure as variáveis de
            ambiente, aplique as migrations e conceda acesso ao primeiro
            administrador conforme o guia em docs/SUPABASE.md. Nenhuma alteração
            administrativa será simulada.
          </p>
        </div>
      )}
      <LoginForm configured={configured} />
      <Link href="/" className="text-link">
        Voltar para a loja
      </Link>
    </main>
  );
}
