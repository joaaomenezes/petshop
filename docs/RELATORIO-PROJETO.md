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
