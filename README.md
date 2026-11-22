# Pet Piraju

O [relatório do projeto](docs/RELATORIO-PROJETO.md) registra a direção comercial atual: loja online com entrega no lançamento e retirada no local reservada para uma fase futura, além do estado da integração e das dependências da etapa 4.

E-commerce pet regional em Next.js App Router, TypeScript strict, Tailwind CSS, Radix/shadcn e Lucide. A identidade e os fluxos das etapas anteriores foram preservados. A etapa 3 acrescenta catálogo Supabase, autenticação administrativa, Storage, controle de estoque e validação Zod.

## Executar localmente

Node.js 22 ou superior e npm:

```bash
npm ci
npm run dev
```

Abra http://localhost:3000. Sem variáveis Supabase, a loja funciona em **modo demonstração**, com os 18 produtos fictícios originais e carrinho local. O login administrativo informa a ausência de configuração e fica desabilitado. Não há painel autenticado fictício.

Produção local:

```bash
npm run build
npm start
```

## Ativar Supabase

Siga [docs/SUPABASE.md](docs/SUPABASE.md) para configurar `.env.local`, aplicar as três migrations e criar com segurança o primeiro administrador. A aplicação só precisa da URL e da chave publicável/anon; não usa service-role. Nenhuma credencial está incluída no repositório e nenhum projeto remoto foi modificado automaticamente.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA-CHAVE-PUBLICAVEL
```

Com configuração válida, a vitrine lê produtos, marcas, categorias, variantes, preços e imagens do banco. Um catálogo real vazio permanece vazio; falhas de conexão não são disfarçadas por dados demonstrativos. Reinicie o servidor e refaça o build ao mudar variáveis.

## Rotas

| Rota | Função |
| --- | --- |
| `/` | Home, categorias ativas e produtos destacados |
| `/produtos` | Busca, filtros na URL, preço, estoque e compra pelos cards |
| `/produto/[slug]` | Galeria, variantes, quantidade e produtos relacionados |
| `/carrinho` | Itens por variante, alteração, remoção e persistência |
| `/admin/login` | Login Supabase Auth para administradores |
| `/admin` | Produtos ativos, variantes, estoque baixo e indisponíveis |
| `/admin/produtos` | Lista e busca de produtos |
| `/admin/produtos/novo` | Cadastro transacional, variantes e imagens |
| `/admin/produtos/[id]` | Edição, status, preços, custo e estoque mínimo |
| `/admin/categorias` | Categorias e hierarquia |
| `/admin/marcas` | Marcas e status |
| `/admin/estoque` | Entradas, ajustes de saída e histórico |
| `/admin/fornecedores` | Dados comerciais de fornecedores |
| `/admin/configuracoes` | Nome, slogan e orientações de segurança |
| `POST /api/cart/validate` | Consulta canônica de preço e disponibilidade no servidor |

Os cinco cadastros gerais são resolvidos por `/admin/[section]`. Todas as páginas administrativas, exceto login, verificam autenticação e role no servidor. Os Server Actions verificam novamente as permissões. A autorização também é aplicada no banco e no Storage.

## Migrations

- `supabase/migrations/202611220001_catalog.sql`: nove tabelas, relacionamentos, índices, constraints, RLS, auditoria, RPCs e concessão administrativa restrita.
- `supabase/migrations/202611220002_storage.sql`: bucket privado, validação de tamanho/MIME e políticas permissivas e restritivas para imagens.
- `supabase/migrations/202611220003_integrity.sql`: prevenção de ciclos de categorias e ordem única de imagens.

Os saldos são inteiros não negativos. SKUs são únicos sem distinção de caixa. Custos não podem ser selecionados pelo público. Estoque inicial positivo e ajustes geram movimentos com responsável. Uma saída acima do saldo desfaz toda a transação. Produtos e variantes são desativados para preservar o histórico, em vez de apagados fisicamente.

Não há tabelas de pedidos, pagamentos ou faturamento fictício.

## Verificações

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Os testes Playwright usam uma instância própria da produção na porta 3100; ela deve estar livre. Os testes de vitrine esperam modo demonstração, sem variáveis Supabase. São verificadas as larguras 320, 375, 390, 430, 768, 1024 e 1440 px.

O conjunto de testes cobre lógica do carrinho, variantes, busca e filtros; validação Zod; migrations em PostgreSQL local via PGlite; RLS, autopromoção, custos, cadastro/edição, SKU duplicado e rollback; estoque e auditoria; políticas de Storage inclusive na presença de política permissiva ampla; redirecionamento de todas as rotas administrativas; login indisponível sem configuração; validação de preços no servidor; e regressão visual/funcional da loja. Axe executa regras automatizadas WCAG A/AA na vitrine e no login.

Homologação de Auth e Storage hospedados depende de um projeto real configurado. Não foi simulada como concluída. Verificações automatizadas de acessibilidade não substituem leitores de tela ou dispositivos físicos.

## Arquivos e arquitetura da etapa 3

- `src/app/layout.tsx`: documento raiz e fontes preservadas.
- `src/app/(store)/`: rotas originais movidas para grupo sem alterar URLs; layout público com catálogo e carrinho.
- `src/app/admin/`: login, layout protegido, dashboard e páginas administrativas.
- `src/app/api/cart/validate/route.ts`: consulta pública de preço/estoque sem pedido ou reserva.
- `src/proxy.ts`: renovação de sessão administrativa e cache privado.
- `src/components/admin/`: sidebar responsiva, login, lista, formulário de produtos, imagens, cadastros, estoque e configurações.
- `src/lib/supabase/`: configuração e cliente SSR com cookies.
- `src/lib/admin/`: autorização server-side, schemas Zod, leitura e Server Actions.
- `src/lib/shop-catalog.ts`: fonte pública do catálogo, seleção explícita de colunas e URLs assinadas.
- `src/contexts/catalog-context.tsx`: dados públicos recebidos do servidor.
- `src/contexts/cart-context.tsx`, `src/lib/cart.ts`, `src/lib/catalog.ts`: adaptados para dados reais, preservando o modo local e o formato anterior do carrinho.
- Componentes existentes em `layout/`, `catalog/`, `product/`, `cart/` e `ui/`: adaptados para o catálogo dinâmico, mantendo o design.
- `src/app/globals.css`: tokens existentes e estilos isolados do painel.
- `src/types/product.ts`: contrato público com imagens e destaque.
- `public/images/product-placeholder.svg`: estado sem fotografia real cadastrada.
- `next.config.ts`: imagens do host Supabase e tamanho permitido de upload por Server Action.
- `.env.example`, `package.json`, `package-lock.json`: configuração e dependências.
- `tests/admin.test.ts`, `tests/database.test.ts`, `tests/e2e/backend.spec.ts`: novas verificações.
- `docs/SUPABASE.md`: configuração, primeiro admin, operação, segurança e limitações.

## Limitações reais

- O projeto remoto ainda precisa ser configurado e receber as migrations. Sem isso, a loja permanece demonstrativa.
- Sem checkout, pagamentos, cálculo de frete, logística, pedidos ou conta de cliente nesta etapa.
- A validação de carrinho consulta dados atuais, sem reservar estoque; o checkout futuro precisará de nova validação transacional.
- URLs de imagens expiram após uma hora; páginas abertas por muito tempo podem precisar ser recarregadas.
- Uploads abandonados antes de salvar podem gerar arquivos órfãos. A limpeza deve conferir ausência de vínculos antes de excluir.
- O histórico de estoque mostra os últimos 200 registros; dados anteriores continuam no banco.
- A vitrine ainda usa fotografias editoriais locais do Unsplash e a identidade provisória em `src/config/brand.ts`; nome e slogan operacionais são configuráveis no painel. Inter e DM Sans são servidas localmente, com licenças em `public/fonts`.
- Indexação permanece desativada enquanto a loja está em desenvolvimento.

## Resultado da validação desta entrega

TypeScript, ESLint e build de produção aprovados. 18 testes de lógica/PostgreSQL local e 25 testes de navegador aprovados. As três migrations foram executadas nos testes locais. Capturas do login e da vitrine estão em artifacts/stage3-*.png. Nenhuma migration foi aplicada a um projeto Supabase hospedado e não houve homologação autenticada remota por ausência de configuração.


## Etapa 4 — checkout em homologação

O fluxo de visitante, endereço, revisão, pedidos privados, reservas e integração de pagamentos exclusivamente de testes foi implementado. A compra continua bloqueada: a migration 004 ainda não foi aplicada ao Supabase hospedado, faltam credenciais privadas, configuração HTTPS/webhook/agendador e regras definitivas de entrega. Frete automático e confirmação por e-mail permanecem pendentes. Retirada no local continua como evolução futura. Consulte [a configuração e os limites do checkout](docs/CHECKOUT.md).

