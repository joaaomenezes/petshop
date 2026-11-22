"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/admin/actions";
const links = [
  ["/admin", "Visão geral"],
  ["/admin/produtos", "Produtos"],
  ["/admin/categorias", "Categorias"],
  ["/admin/marcas", "Marcas"],
  ["/admin/estoque", "Estoque"],
  ["/admin/pedidos", "Pedidos"],
  ["/admin/fornecedores", "Fornecedores"],
  ["/admin/configuracoes", "Configurações"],
];
export function AdminShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const path = usePathname();
  return (
    <div className="admin-shell">
      <a href="#admin-content" className="skip-link">
        Pular para conteúdo
      </a>
      <aside className="admin-sidebar">
        <Link href="/admin" className="logo">
          Pet Piraju.
        </Link>
        <span className="eyebrow">ADMINISTRAÇÃO</span>
        <nav aria-label="Administração">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                path === href ||
                (href !== "/admin" && path.startsWith(href + "/"))
                  ? "page"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/">Visitar loja</Link>
        <form action={logout}>
          <button className="button button-outline">Sair da conta</button>
        </form>
      </aside>
      <div className="admin-workspace">
        <header className="admin-top">
          <span>Painel administrativo</span>
          <span>{email}</span>
        </header>
        <main id="admin-content" className="admin-main">
          {children}
        </main>
      </div>
    </div>
  );
}
