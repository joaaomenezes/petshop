"use client";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { usePathname } from "next/navigation";
import {
  Home,
  Grid2X2,
  Search,
  ShoppingBag,
  UserRound,
  X,
  MapPin,
} from "lucide-react";
import { useState } from "react";
import { brand } from "@/config/brand";
import { useCatalog } from "@/contexts/catalog-context";
import { useCart } from "@/contexts/cart-context";
export function CartBadge() {
  const { lines } = useCart();
  const n = lines.reduce((n, l) => n + l.quantity, 0);
  return n > 0 ? (
    <span className="badge" aria-label={`${n} itens no carrinho`}>
      {n}
    </span>
  ) : null;
}
export function SearchBar({ autoFocus = false }: { autoFocus?: boolean }) {
  return (
    <form action="/produtos" className="search">
      <Search size={19} />
      <input
        type="search"
        autoFocus={autoFocus}
        name="q"
        aria-label="Buscar produtos ou marcas"
        placeholder="O que seu pet precisa?"
      />
      <button type="submit" aria-label="Buscar">
        <Search size={18} />
      </button>
    </form>
  );
}
export function AnnouncementBar() {
  const { demo } = useCatalog();
  return (
    <div className="announcement">
      Pet shop online em Piraju – SP{" "}
      <span className={demo ? "demo-mode" : undefined}>
        • {demo ? "Modo demonstração" : "Cuidado perto de você"}
      </span>
    </div>
  );
}
export function SiteHeader() {
  const { categories, name, demo } = useCatalog();
  const [modal, setModal] = useState<"search" | "account" | null>(null);
  return (
    <>
      <AnnouncementBar />
      <header className="site-header">
        <div className="container header-main">
          <Link className="logo" href="/" aria-label={`${name} — início`}>
            <span className="logo-symbol">{brand.logo}</span>
            {name}
            <span className="logo-dot">.</span>
          </Link>
          <div className="desktop-search">
            <SearchBar />
          </div>
          <div className="header-actions">
            <button
              className="mobile-header-search"
              onClick={() => setModal("search")}
              aria-label="Abrir busca"
            >
              <Search size={22} />
            </button>
            <button
              onClick={() => setModal("account")}
              aria-label="Minha conta"
            >
              <UserRound size={21} />
              <span>Minha conta</span>
            </button>
            <Link href="/carrinho" aria-label="Carrinho" className="cart-link">
              <ShoppingBag size={22} />
              <CartBadge />
            </Link>
          </div>
        </div>
        <nav className="container desktop-nav" aria-label="Categorias">
          <Link href="/produtos">Todos os produtos</Link>
          {categories.map((c) => (
            <Link
              href={`/produtos?${demo && (c === "Gatos" || c === "Cachorros") ? "especie" : "categoria"}=${encodeURIComponent(c)}`}
              key={c}
            >
              {c}
            </Link>
          ))}
          <span>
            <MapPin size={14} /> Feito para Piraju
          </span>
        </nav>
      </header>
      <MobileNavigation open={setModal} />
      {modal && (
        <Dialog
          open={!!modal}
          onClose={() => setModal(null)}
          title={modal === "search" ? "Buscar produtos" : "Minha conta"}
        >
          <button
            autoFocus
            className="modal-close"
            aria-label="Fechar"
            onClick={() => setModal(null)}
          >
            <X />
          </button>
          <h2>
            {modal === "search"
              ? "Encontre o que faz bem."
              : "Sua conta, em breve."}
          </h2>
          {modal === "search" ? (
            <SearchBar />
          ) : (
            <p>
              Estamos preparando um espaço para facilitar suas próximas compras.
              O acesso à conta estará disponível em uma versão futura.
            </p>
          )}
        </Dialog>
      )}
    </>
  );
}
export function MobileNavigation({
  open,
}: {
  open: (v: "search" | "account") => void;
}) {
  const path = usePathname();
  return (
    <nav className="mobile-nav" aria-label="Navegação principal">
      {[
        { label: "Início", href: "/", icon: Home },
        { label: "Categorias", href: "/produtos", icon: Grid2X2 },
        { label: "Buscar", action: "search", icon: Search },
        { label: "Carrinho", href: "/carrinho", icon: ShoppingBag },
        { label: "Conta", action: "account", icon: UserRound },
      ].map((item) => {
        const content = (
          <>
            <item.icon size={21} />
            <span>{item.label}</span>
            {item.label === "Carrinho" && <CartBadge />}
          </>
        );
        return item.href ? (
          <Link
            key={item.label}
            className={
              path === item.href ||
              (item.href === "/produtos" && path.startsWith("/produto/"))
                ? "active"
                : ""
            }
            aria-current={
              path === item.href ||
              (item.href === "/produtos" && path.startsWith("/produto/"))
                ? "page"
                : undefined
            }
            href={item.href}
          >
            {content}
          </Link>
        ) : (
          <button
            key={item.label}
            onClick={() => open(item.action as "search" | "account")}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}
export function SiteFooter() {
  const { demo, name, slogan } = useCatalog();
  return (
    <footer>
      <div className="container footer-grid">
        <div>
          <Link className="logo" href="/">
            {name}.
          </Link>
          <p>{slogan}</p>
          <p>Pet shop online em Piraju – SP.</p>
        </div>
        <div>
          <h3>Explore a loja</h3>
          <Link href="/produtos">Todos os produtos</Link>
          <Link href="/produtos?especie=Cachorros">Para cachorros</Link>
          <Link href="/produtos?especie=Gatos">Para gatos</Link>
          <Link href="/produtos?categoria=Higiene">Higiene e cuidado</Link>
          <Link href="/carrinho">Meu carrinho</Link>
        </div>
        <div>
          <h3>Perto de você</h3>
          <p>
            Atendimento e entrega local serão disponibilizados na versão de
            lançamento.
          </p>
          <p className="footer-demo">
            {demo ? "Catálogo demonstrativo. " : ""}Checkout e conta estarão
            disponíveis em uma versão futura.
          </p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {brand.copyrightYear} {name}
        </span>
        <span>
          {demo ? "Loja demonstrativa · " : ""}Checkout indisponível nesta
          versão
        </span>
      </div>
    </footer>
  );
}
