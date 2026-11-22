import Link from "next/link";
import Image from "next/image";
import { CategoryCard } from "@/components/home/category-card";
import { ShoppingBag, MapPin, RotateCcw } from "lucide-react";
import { ProductGrid, SectionHeading, EmptyState } from "@/components/ui/shop";
import { getCatalog } from "@/lib/shop-catalog";

export default async function Home() {
  const { products, categories, demo } = await getCatalog();
  const featured = products.filter((p) => demo || p.featured).slice(0, 4);
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <span className="eyebrow">BEM-ESTAR EM CADA ESCOLHA</span>
          <h1>
            Tudo para seu pet,
            <br />
            <em>sem complicar.</em>
          </h1>
          <p>
            Os produtos que seu pet precisa, com a praticidade de comprar online
            em Piraju.
          </p>
          <Link className="button" href="/produtos">
            Explorar produtos
          </Link>
          <div className="hero-note">
            Perto de você. Presente na rotina deles.
          </div>
        </div>
        <div className="hero-photo">
          <Image
            src="/images/editorial/pets.jpg"
            alt="Cachorro em um ambiente acolhedor"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 55vw"
          />
          <div className="hero-cat">
            <Image
              src="/images/editorial/cat.jpg"
              alt="Gato descansando"
              fill
              sizes="180px"
            />
          </div>
          <span className="photo-label">Companhia para todos os dias.</span>
        </div>
      </section>

      <section className="container category-section">
        <div className="inline-heading">
          <SectionHeading title="Um cuidado para cada pet" />
          <Link className="text-link" href="/produtos">
            Ver tudo
          </Link>
        </div>
        <div className="categories">
          {categories.map((c, i) => (
            <CategoryCard
              key={c}
              name={c}
              species={demo && i < 2}
              image={
                demo
                  ? i < 2
                    ? `/images/categories/${i}.jpg`
                    : `/images/products/product-${[0, 0, 1, 5, 4, 15][i] || 1}.svg`
                  : products.find((p) => p.category === c)?.images[0] ||
                    "/images/product-placeholder.svg"
              }
            />
          ))}
        </div>
      </section>
      <section
        className="container local-delivery"
        aria-labelledby="local-delivery-title"
      >
        <MapPin size={25} strokeWidth={1.5} aria-hidden="true" />
        <div>
          <h2 id="local-delivery-title">Comprou online. Recebeu em Piraju.</h2>
          <p>
            Uma experiência de compra pensada para quem vive em Piraju – SP.
          </p>
        </div>
        <span>
          Entrega disponível no lançamento.
          <br />
          Esta versão não realiza pedidos.
        </span>
      </section>
      <section className="container featured">
        <div className="inline-heading">
          <SectionHeading
            eyebrow="ESCOLHAS PARA A ROTINA"
            title="Pequenos cuidados. Grandes companheiros."
          />
          <Link href="/produtos" className="text-link">
            Ver todos os produtos
          </Link>
        </div>
        {featured.length ? (
          <ProductGrid products={featured} />
        ) : (
          <EmptyState
            title="Novidades em breve"
            description="Estamos preparando as próximas escolhas para seu pet."
          />
        )}
        {demo && (
          <p className="demo-note">
            Catálogo demonstrativo. Produtos e marcas fictícios.
          </p>
        )}
      </section>
      <section className="benefits container">
        {[
          {
            icon: ShoppingBag,
            title: "Compra online simples",
            text: "Encontre o que precisa, no seu tempo.",
          },
          {
            icon: MapPin,
            title: "Atendimento local",
            text: "Uma loja pensada para quem vive em Piraju.",
          },
          {
            icon: RotateCcw,
            title: "Recompra facilitada",
            text: "Os favoritos do seu pet, sempre por perto.",
          },
        ].map((b) => (
          <div key={b.title}>
            <b.icon size={25} strokeWidth={1.4} />
            <div>
              <h3>{b.title}</h3>
              <p>{b.text}</p>
            </div>
          </div>
        ))}
      </section>
      <section className="editorial container">
        <div className="editorial-photo">
          <Image
            src="/images/editorial/dog.jpg"
            alt="Cachorro aproveitando um momento ao ar livre"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
        <div className="editorial-copy">
          <span className="eyebrow">O QUE IMPORTA ESTÁ PERTO</span>
          <h2>
            Mais cuidado para eles.
            <br />
            <em>Mais tempo para você.</em>
          </h2>
          <p>
            A gente acredita que cuidar pode ser simples. Por isso, reunimos
            escolhas para uma rotina mais leve — e para sobrar tempo para os
            passeios, os carinhos e a vida juntos.
          </p>
          <Link href="/produtos" className="text-link">
            Conheça nosso catálogo
          </Link>
        </div>
      </section>
    </>
  );
}
