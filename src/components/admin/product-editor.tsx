"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ProductCategories } from "./product-categories";
import {
  saveProduct,
  uploadImage,
  removeUnusedImage,
} from "@/lib/admin/actions";
import { slugify, type AdminData, type ProductInput } from "@/lib/admin/schema";
export function ProductEditor({
  data,
  initial,
  notice = "",
}: {
  data: AdminData;
  initial: ProductInput;
  notice?: string;
}) {
  const router = useRouter();
  const [product, setProduct] = useState(initial);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(notice);
  const [success, setSuccess] = useState(!!notice);
  const [previews, setPreviews] = useState<Record<string, string>>(
    Object.fromEntries(
      data.images
        .filter((i) => i.preview)
        .map((i) => [i.storage_path, i.preview!]),
    ),
  );
  const existingIds = new Set(data.variants.map((v) => v.id));
  const existingImages = new Set(data.images.map((i) => i.storage_path));
  function variant(
    index: number,
    key: string,
    value: string | number | boolean | null,
  ) {
    setProduct((p) => ({
      ...p,
      variants: p.variants.map((v, i) =>
        i === index ? { ...v, [key]: value } : v,
      ),
    }));
  }
  function order(index: number, target: number) {
    setProduct((p) => {
      const images = [...p.images];
      const [image] = images.splice(index, 1);
      images.splice(target, 0, image);
      return { ...p, images: images.map((i, n) => ({ ...i, sort_order: n })) };
    });
  }
  async function upload(files: FileList | null) {
    if (!files) return;
    if (product.images.length + files.length > 12) {
      setMessage("Use no máximo 12 imagens.");
      return;
    }
    setUploading(true);
    setSuccess(false);
    try {
      for (const file of Array.from(files)) {
        if (
          file.size > 5 * 1024 * 1024 ||
          !["image/jpeg", "image/png", "image/webp"].includes(file.type)
        ) {
          setMessage("Use imagens JPEG, PNG ou WebP de até 5 MB.");
          break;
        }
        const form = new FormData();
        form.set("image", file);
        const result = await uploadImage(form);
        if (!result.ok || !result.path || !result.preview) {
          setMessage(result.message);
          break;
        }
        const path = result.path;
        setPreviews((old) => ({ ...old, [path]: result.preview! }));
        setProduct((p) => ({
          ...p,
          images: [
            ...p.images,
            {
              storage_path: path,
              alt_text: p.name || "Imagem do produto",
              sort_order: p.images.length,
            },
          ],
        }));
        setMessage(result.message);
      }
    } finally {
      setUploading(false);
    }
  }
  return (
    <form
      className="admin-form product-editor"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage("");
        setSuccess(false);
        start(async () => {
          const result = await saveProduct(product);
          setMessage(result.message);
          setSuccess(result.ok);
          if (result.ok) {
            router.replace(
              `/admin/produtos/${result.id}?saved=${result.message.includes("arquivos antigos") ? "cleanup" : "1"}`,
            );
            router.refresh();
          }
        });
      }}
    >
      <div className="admin-heading">
        <div>
          <span className="eyebrow">CATÁLOGO</span>
          <h1>
            {data.products.some((p) => p.id === product.id)
              ? "Editar produto"
              : "Novo produto"}
          </h1>
        </div>
        <Link href="/admin/produtos" className="text-link">
          Voltar aos produtos
        </Link>
      </div>
      <fieldset disabled={pending || uploading} className="admin-panel">
        <legend>Dados gerais</legend>
        <div className="admin-form-grid">
          <label>
            Nome
            <input
              value={product.name}
              required
              maxLength={200}
              onChange={(e) =>
                setProduct((p) => ({
                  ...p,
                  name: e.target.value,
                  slug: !p.updated_at ? slugify(e.target.value) : p.slug,
                }))
              }
            />
          </label>
          <label>
            Slug
            <input
              value={product.slug}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              onChange={(e) =>
                setProduct((p) => ({ ...p, slug: e.target.value }))
              }
            />
          </label>
          <label>
            Marca
            <select
              required
              value={product.brand_id}
              onChange={(e) =>
                setProduct((p) => ({ ...p, brand_id: e.target.value }))
              }
            >
              <option value="">Selecione</option>
              {data.brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {!b.active ? " (inativa)" : ""}
                </option>
              ))}
            </select>
          </label>
          <ProductCategories
            categories={data.categories}
            value={product.category_id}
            onChange={(id) => setProduct((p) => ({ ...p, category_id: id }))}
          />
          <label>
            Espécie
            <select
              value={product.species}
              onChange={(e) =>
                setProduct((p) => ({
                  ...p,
                  species: e.target.value as ProductInput["species"],
                }))
              }
            >
              {["Cachorros", "Gatos", "Ambos"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Descrição
          <textarea
            rows={5}
            maxLength={20000}
            value={product.description}
            onChange={(e) =>
              setProduct((p) => ({ ...p, description: e.target.value }))
            }
          />
        </label>
        <div className="admin-checks">
          <label>
            <input
              type="checkbox"
              checked={product.active}
              onChange={(e) =>
                setProduct((p) => ({ ...p, active: e.target.checked }))
              }
            />{" "}
            Produto ativo
          </label>
          <label>
            <input
              type="checkbox"
              checked={product.featured}
              onChange={(e) =>
                setProduct((p) => ({ ...p, featured: e.target.checked }))
              }
            />{" "}
            Destaque na Home
          </label>
        </div>
        <p>
          Marca e categoria precisam estar ativas para o produto aparecer na
          loja.
        </p>
      </fieldset>
      <fieldset disabled={pending || uploading} className="admin-panel">
        <legend>Imagens</legend>
        <p>
          A primeira imagem será a principal. JPEG, PNG ou WebP, até 5 MB por
          arquivo e 12 imagens por produto.
        </p>
        <label>
          Enviar fotos
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <div className="admin-images">
          {product.images.map((img, index) => (
            <article key={img.storage_path}>
              {previews[img.storage_path] && (
                <Image
                  src={previews[img.storage_path]}
                  alt={img.alt_text}
                  width={240}
                  height={200}
                  unoptimized
                />
              )}
              <strong>
                {index === 0 ? "Imagem principal" : `Imagem ${index + 1}`}
              </strong>
              <label>
                Texto alternativo
                <input
                  value={img.alt_text}
                  required
                  maxLength={300}
                  onChange={(e) =>
                    setProduct((p) => ({
                      ...p,
                      images: p.images.map((i, n) =>
                        n === index ? { ...i, alt_text: e.target.value } : i,
                      ),
                    }))
                  }
                />
              </label>
              <div className="admin-inline-actions">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => order(index, 0)}
                >
                  Tornar principal
                </button>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => order(index, index - 1)}
                >
                  Antes
                </button>
                <button
                  type="button"
                  disabled={index === product.images.length - 1}
                  onClick={() => order(index, index + 1)}
                >
                  Depois
                </button>
                <button
                  type="button"
                  onClick={() => {
                    start(async () => {
                      if (!existingImages.has(img.storage_path)) {
                        const result = await removeUnusedImage(
                          img.storage_path,
                        );
                        if (!result.ok) {
                          setMessage(result.message);
                          return;
                        }
                      }
                      setProduct((p) => ({
                        ...p,
                        images: p.images
                          .filter((i) => i.storage_path !== img.storage_path)
                          .map((i, n) => ({ ...i, sort_order: n })),
                      }));
                    });
                  }}
                >
                  Remover
                </button>
              </div>
            </article>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={pending || uploading} className="admin-panel">
        <legend>Variantes e embalagens</legend>
        <p>
          Valores monetários em centavos (R$ 89,90 = 8990). Saldos existentes
          são alterados somente na página de estoque, com motivo e responsável.
        </p>
        {product.variants.map((v, index) => (
          <section className="admin-variant" key={v.id}>
            <h3>Variante {index + 1}</h3>
            <div className="admin-form-grid">
              <label>
                Embalagem
                <input
                  required
                  value={v.label}
                  maxLength={80}
                  onChange={(e) => variant(index, "label", e.target.value)}
                  placeholder="3 kg"
                />
              </label>
              <label>
                SKU
                <input
                  required
                  value={v.sku}
                  maxLength={80}
                  onChange={(e) => variant(index, "sku", e.target.value)}
                />
              </label>
              <label>
                Código de barras
                <input
                  value={v.barcode}
                  inputMode="numeric"
                  pattern="([0-9]{8,14})?"
                  onChange={(e) => variant(index, "barcode", e.target.value)}
                />
              </label>
              {[
                ["price_cents", "Preço de venda (centavos)"],
                ["cost_cents", "Custo (centavos)"],
                ["weight_grams", "Peso líquido do produto (g)"],
                ["stock_quantity", "Estoque"],
                ["min_stock_quantity", "Estoque mínimo"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    type="number"
                    required
                    min={0}
                    max={2147483647}
                    step={1}
                    readOnly={key === "stock_quantity" && existingIds.has(v.id)}
                    value={v[key as keyof typeof v] as number}
                    onChange={(e) =>
                      variant(index, key, Number(e.target.value))
                    }
                  />
                </label>
              ))}
            </div>
            <fieldset
              className="shipping-measurements"
              disabled={!data.shippingSchemaReady}
            >
              <legend>Medidas para envio</legend>
              {!data.shippingSchemaReady && (
                <p role="status">
                  Aplique a migration 202611220005_national_shipping.sql para
                  cadastrar e salvar medidas de envio.
                </p>
              )}
              <p>
                Informe as medidas de uma unidade pronta para envio, incluindo
                embalagem e proteção. Sem estes dados, o frete desta variante
                não será calculado.
              </p>
              <div className="admin-form-grid">
                {[
                  ["shipping_weight_grams", "Peso com embalagem (g)"],
                  ["package_width_cm", "Largura da embalagem (cm)"],
                  ["package_height_cm", "Altura da embalagem (cm)"],
                  ["package_length_cm", "Comprimento da embalagem (cm)"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="number"
                      inputMode="decimal"
                      min={key === "shipping_weight_grams" ? 1 : 0.01}
                      max={key === "shipping_weight_grams" ? 1000000 : 1000}
                      step={key === "shipping_weight_grams" ? 1 : 0.01}
                      value={
                        (v[key as keyof typeof v] as
                          number | null | undefined) ?? ""
                      }
                      onChange={(event) =>
                        variant(
                          index,
                          key,
                          event.target.value === ""
                            ? null
                            : Number(event.target.value),
                        )
                      }
                    />
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={v.active}
                onChange={(e) => variant(index, "active", e.target.checked)}
              />{" "}
              Variante ativa
            </label>
            {!existingIds.has(v.id) && product.variants.length > 1 && (
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  setProduct((p) => ({
                    ...p,
                    variants: p.variants.filter((x) => x.id !== v.id),
                  }))
                }
              >
                Remover variante nova
              </button>
            )}
            {existingIds.has(v.id) && (
              <Link href="/admin/estoque" className="text-link">
                Ajustar estoque com histórico
              </Link>
            )}
          </section>
        ))}
        <button
          type="button"
          className="button button-outline"
          disabled={product.variants.length >= 30}
          onClick={() =>
            setProduct((p) => ({
              ...p,
              variants: [
                ...p.variants,
                {
                  id: crypto.randomUUID(),
                  label: "",
                  sku: "",
                  barcode: "",
                  price_cents: 0,
                  cost_cents: 0,
                  weight_grams: 0,
                  stock_quantity: 0,
                  min_stock_quantity: 5,
                  active: true,
                },
              ],
            }))
          }
        >
          Adicionar variante
        </button>
      </fieldset>
      <div className="admin-save">
        <p role={success ? "status" : "alert"}>
          {uploading ? "Enviando imagens…" : message}
        </p>
        <button className="button" disabled={pending || uploading}>
          {pending ? "Salvando…" : "Salvar produto"}
        </button>
      </div>
    </form>
  );
}
