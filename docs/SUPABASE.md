# Supabase — configuração da etapa 3

## Estado desta entrega

A integração, o painel e as migrations estão implementados. Sem as duas variáveis de conexão, a loja usa somente o catálogo local e identifica o modo demonstração. O login administrativo fica desabilitado; não existe autenticação simulada nem alteração administrativa salva em localStorage.

Nenhum projeto Supabase foi criado ou modificado automaticamente. É necessário aplicar as migrations em um projeto próprio para usar o catálogo real. Os testes de banco executam as migrations em PostgreSQL local via PGlite, com schemas mínimos de Auth e Storage; não substituem a homologação dos serviços hospedados.

## 1. Preparar o projeto

1. Crie ou escolha um projeto Supabase e faça backup se houver dados existentes. As migrations criam as tabelas `public` descritas abaixo e pressupõem que esses nomes ainda não existam.
2. Copie `.env.example` para `.env.local`.
3. Em Project Settings / API, obtenha a URL e a chave **publishable** (ou a chave pública legada `anon`). Configure:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA-CHAVE-PUBLICAVEL
```

A chave legada pode usar `NEXT_PUBLIC_SUPABASE_ANON_KEY` como alternativa. Não configure `service_role`, `sb_secret_*`, senha do banco ou connection string em `NEXT_PUBLIC_*`. Esta aplicação não precisa de chave service-role. As permissões são concedidas por sessão Auth e RLS, inclusive nos Server Actions.

A configuração parcial é tratada como erro. Uma loja configurada que não consegue acessar o banco exibe um estado de erro, sem substituir o catálogo real por exemplos. Ao alterar variáveis, reinicie o desenvolvimento; para produção, faça novo build com as variáveis definidas.

## 2. Aplicar migrations

Com Supabase CLI instalado e autenticado:

```bash
supabase init
supabase link --project-ref SEU-PROJECT-REF
supabase db push
```

Alternativamente, execute no SQL Editor, em ordem, com o proprietário do banco:

1. `supabase/migrations/202611220001_catalog.sql`
2. `supabase/migrations/202611220002_storage.sql`
3. `supabase/migrations/202611220003_integrity.sql`

As migrations são versionadas e devem ser aplicadas uma única vez. A primeira cria `brands`, `categories`, `products`, `product_variants`, `product_images`, `suppliers`, `inventory_movements`, `admin_users` e `store_settings`, além de índices, constraints, triggers, RLS e RPCs. A segunda configura o bucket privado `product-images` e políticas de Storage. A terceira impede ciclos de categorias e posições de imagem duplicadas.

Não há seed de produtos ou pessoas. A única configuração inicial é nome/slogan da loja. Não são criadas tabelas de pedidos ou pagamentos.

## 3. Criar o primeiro administrador com segurança

1. Em Authentication / Users, crie um usuário com e-mail que você controla e senha forte. Conclua a confirmação necessária.
2. Copie o UUID desse usuário.
3. No SQL Editor, como proprietário do banco, execute:

```sql
call public.grant_admin('UUID-DO-USUARIO'::uuid);
```

A procedure não concede execução a `anon`, `authenticated` ou `PUBLIC`. Só o proprietário do banco pode executá-la. Usuários não podem inserir, atualizar ou excluir linhas em `admin_users` pela API. A autorização nunca usa metadata editável do usuário.

Para revogar acesso, o proprietário executa:

```sql
delete from public.admin_users where user_id = 'UUID-DO-USUARIO'::uuid;
```

O acesso é revalidado no servidor e no banco a cada operação. Revogar a role bloqueia novas operações mesmo com sessão Auth ainda válida. Contas usadas como responsáveis por movimentos têm referências de auditoria; revogue acesso em vez de apagar a identidade histórica.

Desabilite inscrições públicas se a aplicação não usar cadastro de clientes. Configure a URL real da aplicação em Authentication / URL Configuration e as políticas de proteção do seu projeto. Esta etapa oferece login por senha e saída, sem cadastro público nem recuperação de senha dentro do painel; gerencie recuperação pelo Supabase.

## 4. Usar o painel

Acesse `/admin/login`. Somente usuários presentes em `admin_users` entram. Um usuário Auth sem role administrativa não tem acesso ao painel nem às RPCs.

Rotas:

- `/admin`: dashboard com produtos ativos, variantes, estoque baixo e indisponíveis.
- `/admin/produtos`: lista, busca por nome/SKU e filtro por status.
- `/admin/produtos/novo` e `/admin/produtos/[id]`: produto, variantes e imagens.
- `/admin/categorias`: categorias, pai opcional, edição e exclusão de registros sem vínculos.
- `/admin/marcas`: marcas e status.
- `/admin/estoque`: entradas, saídas por ajuste, alertas e últimos 200 movimentos.
- `/admin/fornecedores`: dados comerciais e status.
- `/admin/configuracoes`: nome e slogan; orientações de integração e segurança.

Cadastre marcas e categorias antes de cadastrar produtos. Para publicar, ative produto, marca, categoria e pelo menos uma variante. Marque destaque para aparecer na Home. O produto pode estar publicado e sem estoque; a compra fica indisponível.

Os preços e custos são inteiros em centavos. Exemplo: `8990` corresponde a R$ 89,90. O peso é em gramas. Estoque mínimo é configurado por variante. SKUs são únicos mesmo com diferença de maiúsculas/minúsculas.

## 5. Estoque e auditoria

O saldo inicial de uma variante gera movimento quando maior que zero. O responsável é `auth.uid()` da sessão administrativa. Alterações posteriores passam exclusivamente por `adjust_inventory`, que valida parâmetros, bloqueia a linha com `FOR UPDATE`, altera o saldo e insere o movimento na mesma transação. Erros desfazem a operação inteira. Saídas acima do saldo são recusadas.

A edição de produto recusa alterações de saldo de variantes já existentes. O cadastro de produto é transacional, mantém IDs e verifica `updated_at` para impedir que uma edição antiga sobrescreva outra. Variantes são desativadas, preservando o histórico. Produtos são retirados da loja pelo campo ativo; não há exclusão física de produto no painel.

As roles HTTP não têm permissão de INSERT/UPDATE/DELETE em variantes ou movimentos. As RPCs têm `SECURITY DEFINER`, `search_path` fixo e validação interna de admin; execução é revogada de `PUBLIC` e concedida somente a `authenticated`. Custos não têm permissão de leitura pública por coluna. O painel recebe os custos por RPC exclusivamente administrativa.

## 6. Imagens

Bucket `product-images` privado, limite de 5 MB, MIME JPEG/PNG/WebP. A aplicação verifica tamanho, MIME e assinatura dos bytes no servidor; SVG e outros formatos são rejeitados. O envio é sequencial, uma imagem por Server Action; limite da requisição configurado em 6 MB e até 12 imagens por produto.

A primeira imagem da lista é a principal. Use Tornar principal, Antes e Depois para ordenar. O texto alternativo é obrigatório. As imagens só passam a integrar o catálogo após salvar o produto. A gravação dos vínculos é transacional; não há sucesso fictício em falha de upload.

A vitrine usa URLs assinadas por uma hora apenas para imagens vinculadas a produtos públicos. O acesso ao objeto passa pela política de Storage e pelas tabelas com RLS. O painel pode visualizar rascunhos com sessão administrativa. Após expiração, uma nova navegação/recarregamento renova URLs; a página já aberta por mais de uma hora pode precisar ser recarregada.

Remover foto existente no formulário só desvincula ao salvar. Arquivos antigos não referenciados são removidos após a gravação; uma falha de limpeza não desfaz o produto salvo. Uploads abandonados ao sair sem salvar podem permanecer órfãos. Sua limpeza operacional deve conferir ausência em `product_images`; arquivos referenciados não podem ser apagados pelas políticas administrativas. Não faça limpeza genérica por idade sem verificar vínculos.

## 7. Carrinho e futura validação

O carrinho persiste IDs de produto/variante e quantidades, sem copiar preços do navegador. O catálogo recebido do servidor fornece os valores exibidos. Ao configurar a loja real, IDs demonstrativos antigos que não existem no banco são removidos no saneamento do carrinho.

`POST /api/cart/validate` aceita:

```json
[{"variantId":"UUID-DA-VARIANTE","quantity":2}]
```

Retorna disponibilidade, saldo e preço canônico em centavos, além do total calculado no servidor. Campos extras como preço informado pelo cliente são rejeitados. IDs desconhecidos retornam `valid: false`. Não há reserva, cobrança, pedido ou garantia de disponibilidade futura. Na implementação do checkout, será necessária nova validação e reserva transacional.

Para testar o catálogo local, os IDs antigos `base`/`large` são por produto, portanto inclua `productId` (exemplo: `p1`) para desambiguar. A consulta retorna explicitamente `demo: true`. O banco real usa UUID global por variante.

## 8. Testes e homologação

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Os testes atuais de interface usam modo demonstração, sem variáveis Supabase, e um servidor de produção separado na porta 3100. Os testes PostgreSQL aplicam as três migrations em PGlite com contratos mínimos de `auth` e `storage`, verificando RLS, autopromoção, custos, RPCs, SKU duplicado, rollback, cadastro/edição, auditoria, estoque e imagens. Não é teste de rede do Auth/Storage hospedado.

Antes de publicar com um projeto real, homologue login, renovação de sessão, upload/download, edição concorrente, remoção de imagens, logout e revogação de administrador. Faça backup do banco e do Storage e configure monitoramento no ambiente de hospedagem. A homologação autenticada depende de um projeto configurado e não foi realizada automaticamente nesta entrega.

Referências utilizadas: [SSR com Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) e [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control).

