"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveEntity,
  removeEntity,
  adjustStock,
  saveSettings,
} from "@/lib/admin/actions";
import { slugify, type AdminData, type Entity } from "@/lib/admin/schema";
export function EntityManager({
  kind,
  data,
}: {
  kind: "marcas" | "categorias" | "fornecedores";
  data: AdminData;
}) {
  const list =
    kind === "marcas"
      ? data.brands
      : kind === "categorias"
        ? data.categories
        : data.suppliers;
  const [edit, setEdit] = useState<Entity | null>(null);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <div className="admin-heading">
        <h1>
          {kind === "marcas"
            ? "Marcas"
            : kind === "categorias"
              ? "Categorias"
              : "Fornecedores"}
        </h1>
      </div>
      <form
        key={edit?.id || "new"}
        className="admin-form admin-panel"
        onSubmit={(e) => {
          e.preventDefault();
          const element = e.currentTarget;
          const form = new FormData(e.currentTarget);
          const input = {
            id: edit?.id,
            name: String(form.get("name")),
            slug: String(form.get("slug") || slugify(String(form.get("name")))),
            parent_id: form.get("parent_id") || null,
            contact_info: String(form.get("contact_info") || ""),
            active: form.get("active") === "on",
          };
          start(async () => {
            const result = await saveEntity(kind, input);
            setMessage(result.message);
            if (result.ok) {
              if (!edit) element.reset();
              setEdit(null);
              router.refresh();
            }
          });
        }}
      >
        <h2>{edit ? "Editar registro" : "Novo registro"}</h2>
        <div className="admin-form-grid">
          <label>
            Nome
            <input
              name="name"
              required
              maxLength={120}
              defaultValue={edit?.name || ""}
            />
          </label>
          {kind !== "fornecedores" && (
            <label>
              Slug
              <input
                name="slug"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                defaultValue={edit?.slug || ""}
              />
            </label>
          )}
          {kind === "categorias" && (
            <label>
              Categoria pai
              <select name="parent_id" defaultValue={edit?.parent_id || ""}>
                <option value="">Sem categoria pai</option>
                {data.categories
                  .filter((c) => c.id !== edit?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {kind === "fornecedores" && (
            <label>
              Contato
              <textarea
                name="contact_info"
                maxLength={2000}
                defaultValue={edit?.contact_info || ""}
                placeholder="Dados comerciais fornecidos pelo fornecedor"
              />
            </label>
          )}
        </div>
        <label className="admin-checkbox">
          <input
            name="active"
            type="checkbox"
            defaultChecked={edit?.active ?? true}
          />{" "}
          Ativo
        </label>
        <div className="admin-inline-actions">
          <button className="button" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </button>
          {edit && (
            <button type="button" onClick={() => setEdit(null)}>
              Cancelar edição
            </button>
          )}
        </div>
      </form>
      <p role="status">{message}</p>
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.name}
                  <small>{item.slug || item.contact_info}</small>
                </td>
                <td>{item.active ? "Ativo" : "Inativo"}</td>
                <td>
                  <div className="admin-inline-actions">
                    <button
                      onClick={() => {
                        setEdit(item);
                        window.scrollTo({ top: 0, behavior: "instant" });
                      }}
                    >
                      Editar
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Excluir ${item.name}? Registros vinculados devem ser desativados.`,
                          )
                        )
                          start(async () => {
                            const result = await removeEntity(kind, item.id);
                            setMessage(result.message);
                            if (result.ok) router.refresh();
                          });
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && (
          <p className="admin-empty">Nenhum registro cadastrado.</p>
        )}
      </div>
    </>
  );
}
export function InventoryManager({ data }: { data: AdminData }) {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState("");
  const router = useRouter();
  const variants = data.variants.filter((v) =>
    `${v.sku} ${v.label} ${data.products.find((p) => p.id === v.product_id)?.name}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  return (
    <>
      <div className="admin-heading">
        <h1>Controle de estoque</h1>
      </div>
      <form
        className="admin-form admin-panel"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          start(async () => {
            const r = await adjustStock({
              variant_id: f.get("variant_id"),
              type: f.get("type"),
              quantity: Number(f.get("quantity")),
              reason: f.get("reason"),
            });
            setMessage(r.message);
            if (r.ok) router.refresh();
          });
        }}
      >
        <h2>Registrar movimentação</h2>
        <div className="admin-form-grid">
          <label>
            Variante
            <select name="variant_id" required>
              <option value="">Selecione</option>
              {data.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {data.products.find((p) => p.id === v.product_id)?.name} ·{" "}
                  {v.label} · {v.sku}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <select name="type">
              <option value="entrada">Entrada de mercadoria</option>
              <option value="saida">Saída por ajuste</option>
            </select>
          </label>
          <label>
            Quantidade
            <input
              name="quantity"
              type="number"
              required
              min={1}
              step={1}
              max={2147483647}
            />
          </label>
          <label>
            Motivo
            <input
              name="reason"
              required
              minLength={3}
              maxLength={500}
              placeholder="Informe a justificativa do ajuste"
            />
          </label>
        </div>
        <button className="button" disabled={pending}>
          {pending ? "Registrando…" : "Registrar movimentação"}
        </button>
        <p role="status">{message}</p>
      </form>
      <div className="admin-form admin-filter">
        <label>
          Buscar variante
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Nome, SKU ou embalagem"
          />
        </label>
      </div>
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Produto / SKU</th>
              <th>Embalagem</th>
              <th>Saldo</th>
              <th>Mínimo</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id}>
                <td>
                  {data.products.find((p) => p.id === v.product_id)?.name}
                  <small>{v.sku}</small>
                </td>
                <td>{v.label}</td>
                <td>{v.stock_quantity}</td>
                <td>{v.min_stock_quantity}</td>
                <td>
                  {v.stock_quantity === 0
                    ? "Indisponível"
                    : v.stock_quantity <= v.min_stock_quantity
                      ? "Estoque baixo"
                      : "Disponível"}
                  {!v.active ? " · Inativa" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!variants.length && (
          <p className="admin-empty">Nenhuma variante encontrada.</p>
        )}
      </div>
      <section className="admin-panel">
        <h2>Histórico de movimentações</h2>
        <p>
          Últimos 200 registros. Histórico imutável; os responsáveis são
          identificados pelo ID do Supabase Auth.
        </p>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>SKU</th>
                <th>Movimentação</th>
                <th>Motivo</th>
                <th>Responsável</th>
              </tr>
            </thead>
            <tbody>
              {data.movements.map((m) => (
                <tr key={m.id}>
                  <td>
                    {new Date(m.created_at).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })}
                  </td>
                  <td>
                    {data.variants.find((v) => v.id === m.variant_id)?.sku}
                  </td>
                  <td>
                    {m.type} · {m.quantity}
                  </td>
                  <td>{m.reason}</td>
                  <td>
                    <small>
                      {m.created_by ||
                        (m.actor_kind === "system"
                          ? "Sistema · pagamento"
                          : "Responsável não informado")}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.movements.length && (
            <p className="admin-empty">Nenhuma movimentação registrada.</p>
          )}
        </div>
      </section>
    </>
  );
}
export function SettingsManager({ data }: { data: AdminData }) {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <div className="admin-heading">
        <h1>Configurações</h1>
      </div>
      <form
        className="admin-form admin-panel"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          start(async () => {
            const r = await saveSettings({
              name: f.get("name"),
              slogan: f.get("slogan"),
            });
            setMessage(r.message);
            if (r.ok) router.refresh();
          });
        }}
      >
        <h2>Identificação da loja</h2>
        <label>
          Nome
          <input
            name="name"
            required
            maxLength={80}
            defaultValue={data.settings.name}
          />
        </label>
        <label>
          Slogan
          <input
            name="slogan"
            maxLength={160}
            defaultValue={data.settings.slogan}
          />
        </label>
        <button className="button" disabled={pending}>
          {pending ? "Salvando…" : "Salvar configurações"}
        </button>
        <p role="status">{message}</p>
      </form>
      <section className="admin-panel">
        <h2>Integração e segurança</h2>
        <p>
          Supabase conectado. Autenticação e permissões verificadas no servidor.
          Nenhuma chave administrativa é enviada ao navegador.
        </p>
        <p>
          O estoque mínimo é configurado por variante no cadastro de produto. As
          alterações de saldo passam pelo controle de estoque.
        </p>
        <p>
          Novos administradores só podem ser concedidos pelo responsável pelo
          banco, por procedimento restrito. Consulte docs/SUPABASE.md.
        </p>
        <p>Checkout, pagamentos e logística não fazem parte desta etapa.</p>
      </section>
    </>
  );
}
