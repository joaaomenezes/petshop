# Relatório do projeto — Pet Piraju

## Direção comercial aprovada

A Pet Piraju será uma loja online: o cliente consulta o catálogo, escolhe uma embalagem, adiciona produtos ao carrinho, informa os dados da compra, escolhe uma forma de pagamento e recebe o pedido no endereço informado.

O lançamento terá **entrega como única modalidade de recebimento**. **Retirada no local fica registrada como evolução futura**, sem opção selecionável no checkout inicial e sem divulgação de endereço ou horário de retirada nesta fase.

Não há definição de frete grátis, prazo, taxa ou área de cobertura. Essas regras precisam ser fornecidas pelo responsável pela loja antes de ativar compras reais. Um endereço fora da cobertura deverá ser informado ao cliente antes do pagamento.

## Estrutura da experiência de compra

1. **Catálogo:** produtos ativos, categorias, marcas, espécie, embalagens, preços e disponibilidade.
2. **Carrinho:** variantes e quantidades; valores recalculados com dados do servidor.
3. **Identificação:** compra como visitante, com nome, e-mail e telefone, sem obrigatoriedade de criar senha. Uma conta de cliente poderá facilitar compras posteriores e nunca concederá acesso administrativo.
4. **Entrega:** endereço completo, número, complemento opcional, bairro, cidade, UF e CEP; validação de cobertura e apresentação de frete e prazo efetivamente configurados.
5. **Revisão:** itens, embalagens, quantidades, endereço, frete e total apresentados antes da confirmação.
6. **Pagamento:** integração com provedor seguro, inicialmente em ambiente de testes. Nenhum dado de cartão será armazenado pela loja.
7. **Pedido:** número de referência e acompanhamento protegido. Informar apenas o e-mail não deverá permitir consultar pedidos de outra pessoa; será necessária autenticação ou prova de acesso ao e-mail/link seguro.

Esta seção descreve o fluxo a implementar na etapa 4; não significa que checkout ou pagamentos já estejam disponíveis.

## Administração e segurança

- O administrador gerencia produtos, imagens, marcas, categorias, variantes, preços, custos, fornecedores e estoque.
- Contas de clientes não recebem função administrativa automaticamente.
- A autorização é verificada no servidor e no Supabase, com dados internos protegidos da leitura pública.
- O checkout deverá validar preços e estoque no servidor. Reservas, pagamentos, cancelamentos e liberação de estoque precisam ser transacionais e tolerar notificações duplicadas.
- A gestão futura de pedidos incluirá confirmação de pagamento, separação, envio, entrega e tratamento de cancelamentos, conforme regras aprovadas.

## Situação verificada

- Loja e painel administrativo implementados.
- Três migrations aplicadas ao projeto Supabase configurado neste ambiente; nove tabelas criadas, além das políticas e do bucket privado de imagens.
- Primeiro acesso administrativo concedido à conta indicada pelo proprietário.
- Leitura pública do catálogo testada; acesso anônimo a custos, fornecedores, administradores e funções administrativas bloqueado.
- Cadastro inicial publicado com imagem, variante, preço e estoque; ainda requer revisão dos dados comerciais antes de uso real.
- Carregamento da imagem no Supabase validado após recarregar a configuração do servidor de desenvolvimento.
- Checkout, pedidos, pagamentos, frete e confirmações automáticas ainda não implementados.

Os testes executados até a etapa 3 incluem 18 testes de lógica/PostgreSQL local e 25 de navegador. Esses resultados não representam homologação de vendas, pagamentos ou de todo o painel autenticado em produção.

## Próxima etapa: checkout, pedidos e pagamento

A construção seguirá com identificação do comprador, endereço, cálculo de entrega configurado, revisão do total, criação segura do pedido e reserva de estoque. A integração de pagamento deverá ser homologada em ambiente de testes antes da ativação comercial.

Antes da liberação para vendas, serão necessários:

- Produtos, preços e estoques comerciais revisados.
- Área atendida, origem das entregas, taxa ou regra de frete e prazos definidos.
- Conta do provedor de pagamento e credenciais configuradas por canal seguro.
- Domínio público com HTTPS e endpoint de notificações do provedor.
- Regras comerciais e canais reais de atendimento fornecidos pelo proprietário.
- Testes de compra, pagamento recusado/expirado, notificações repetidas, concorrência de estoque, cancelamento e consulta protegida de pedidos.

Não haverá venda real habilitada enquanto as dependências obrigatórias estiverem indefinidas.

## Evolução futura registrada: retirada no local

A retirada poderá ser acrescentada posteriormente como segunda modalidade, sem substituir a entrega. Sua ativação dependerá de endereço confirmado, horários, prazo de preparação, instruções ao cliente e fluxo administrativo de pedido pronto/retirado.

Ao implementar a etapa 4, o pedido deverá guardar a modalidade de recebimento e os dados de entrega como um retrato da compra. Isso permitirá acrescentar retirada futuramente sem alterar os registros de pedidos já realizados. Enquanto estiver desativada, a retirada não aparecerá como opção de compra.

## Auditoria mobile com o catálogo real

A revisão foi repetida com o produto cadastrado no Supabase, em navegador Chromium isolado, sem capturar a tela do proprietário e sem alterar estoque ou criar pedidos. O carrinho usado no teste pertence somente ao contexto descartável do navegador automatizado.

As sete larguras passaram: **320, 375, 390, 430, 768, 1024 e 1440 px**.

Foram conferidos Home, catálogo, ficha de produto e carrinho, ausência de rolagem horizontal acidental, imagem real carregada, grid de duas colunas no celular, botões de compra com altura mínima de 44 px, área de compra livre do header e da navegação inferior, adição ao carrinho e persistência após recarregar. Nenhum erro JavaScript foi observado nessa execução.

Em 390 px também foram testados abertura/fechamento da busca e do drawer de filtros e regras automatizadas WCAG A/AA nas quatro páginas, sem violações detectadas.

Reprodução, com a loja em execução e pelo menos um produto ativo com estoque:

```bash
node scripts/audit-mobile.mjs
```

O endereço padrão é `http://localhost:3000`; a variável `AUDIT_BASE_URL` permite usar outro ambiente. Resultados: `artifacts/mobile-live-audit.json`.

**Limite da validação:** são testes automatizados com viewport/toque emulados em Chromium. Não representam homologação física em Android ou iPhone/Safari. Essa verificação, incluindo teclado virtual, preenchimento de endereço e pagamento, deverá fazer parte da homologação do checkout mobile antes de vender.

## Etapa 4 — checkout em homologação

O fluxo de visitante, endereço, revisão, pedidos privados, reservas e integração de pagamentos exclusivamente de testes foi implementado. A compra continua bloqueada: a migration 004 ainda não foi aplicada ao Supabase hospedado, faltam credenciais privadas, configuração HTTPS/webhook/agendador e regras definitivas de entrega. Frete automático e confirmação por e-mail permanecem pendentes. Retirada no local continua como evolução futura. Consulte [a configuração e os limites do checkout](CHECKOUT.md).

## Navegação por pet e categorias

O desktop apresenta Cachorros, Gatos, Rações, Petiscos, Brinquedos, Higiene, Acessórios e Mais. Os dropdowns por pet combinam espécie com categoria; Mais reúne Camas, Cuidados, categorias adicionais cadastradas e acesso ao catálogo completo. Os rótulos curtos são apenas de apresentação: os links usam os nomes oficiais encontrados no catálogo, sem atualizar categorias ou slugs no Supabase. Quando uma categoria ainda não está cadastrada, o atalho usa a busca do catálogo pelo termo correspondente, sem criar uma categoria fictícia.

No mobile, Categorias abre `/categorias`, uma página com animais em destaque e grupos de Alimentação e Cuidados e acessórios. A barra inferior mantém cinco destinos. Dropdowns funcionam por clique/teclado e fecham com Escape, clique externo ou saída de foco.

Validação: build, ESLint e TypeScript; navegação em 320, 375, 390, 430, 768, 1024 e 1440 px, sem rolagem horizontal, incluindo consulta por espécie e verificação automatizada WCAG A/AA em 390 px. Reprodução: `npx playwright test --config playwright.navigation.config.ts`, após `npm run build`.

## Importação das subcategorias

Em `/admin/categorias`, o bloco “Importar subcategorias da Pet Piraju” permite cadastrar as 29 subcategorias da lista do proprietário em um clique. Reaproveita os sete pais existentes, incluindo Rações e Cuidados, sem renomear pais, alterar slugs antigos ou mover produtos. O servidor verifica novamente o papel administrativo, consulta os registros atuais e envia um único INSERT com o lote que falta. Registros já existentes com os mesmos slugs/vínculos são preservados; conflitos interrompem a importação. Falhas do INSERT não deixam lote parcialmente criado. O painel mostra a categoria pai de cada subcategoria.

A execução no Supabase depende do clique em uma sessão administrativa autenticada; a preparação do importador não significa que os registros remotos já foram criados. Nenhum segredo privado foi solicitado ou incluído no código.

O menu e os destaques da Home continuam mostrando categorias raiz. O catálogo mantém as subcategorias nos filtros e passa a incluir produtos descendentes ao selecionar uma categoria pai, combinando normalmente com Cachorros/Gatos.

## Categoria principal e subcategoria no produto

O formulário de produto agora separa Categoria principal e Subcategoria (opcional). A segunda lista mostra somente as subcategorias da principal selecionada; mudar a principal limpa a escolha anterior. Ao editar um produto existente, ambos os campos são derivados do vínculo atual, sem reclassificar produtos automaticamente. É possível manter um produto diretamente na categoria principal. O banco continua recebendo um único `category_id`, correspondente ao nível mais específico escolhido, sem alteração de tabelas ou slugs.

## Abrangência de entrega confirmada

O proprietário definiu envio para todo o Brasil. A configuração manual por cidade/CEP existente é uma base para entrega local, e não implementa cotação nacional. O próximo desenvolvimento de logística deve integrar um serviço de frete com cotação por CEP de origem/destino, peso e dimensões dos volumes, além de prazo, disponibilidade e validação do valor no servidor. O serviço ainda não foi escolhido nem contratado; faltam CEP de origem e regras de embalagem. Retirada continua como evolução futura.

Na tentativa autorizada de aplicar a migration 004, a configuração local não continha conexão PostgreSQL nem token de gerenciamento, e o navegador integrado não conseguiu abrir uma sessão do painel. A consulta pública a `checkout_settings` retornou `PGRST202`. A migration permanece pendente de execução autenticada; nenhuma configuração de venda real foi ativada.

## Frete nacional implementado — preparação para homologação

Adicionados campos de peso com embalagem e dimensões por variante, cotação Melhor Envio no servidor, escolha da modalidade na revisão, preços/prazos e assinatura das opções. O pedido nacional revalida o carrinho sob bloqueio transacional e armazena o serviço/volumes escolhidos. Produtos sem medidas ficam impedidos de cotar. O menu do painel informa a integração nacional em vez de exibir a tabela local quando o token está configurado.

A migration 004 foi executada pelo proprietário (relato de sucesso). A nova migration 005 foi testada localmente e permanece pendente no Supabase hospedado por ausência de acesso administrativo de banco nesta sessão. Nenhuma medida fictícia foi gravada, nenhuma etiqueta foi comprada e pagamentos reais permanecem desativados. Configuração e limites em [FRETE-NACIONAL.md](FRETE-NACIONAL.md).
