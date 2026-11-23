# Checkout — etapa 4, somente testes

Implementados: compra como visitante (nome, e-mail, telefone e endereço), revisão do pedido, cotação no servidor, reserva transacional de estoque, pedidos privados e Checkout Pro do Mercado Pago restrito a vendedor de testes. Nenhum cliente recebe acesso administrativo. A conta administrativa continua dependendo de `admin_users` e da autorização no servidor.

O modo atual permanece desativado. A migration 004 foi validada em PostgreSQL local via PGlite e sua aplicação ao projeto hospedado foi confirmada. Não foram realizados pagamentos ou chamadas autenticadas ao Mercado Pago nesta entrega.

## Preparação para homologação

1. Em um projeto novo, faça backup e aplique as migrations em ordem. A migration 004 já está aplicada no projeto atual; não a execute novamente. Para o frete nacional, aplique a migration 005 descrita em `FRETE-NACIONAL.md`. Prefira um projeto Supabase separado para testes: aprovações de teste também baixam estoque no banco conectado.
2. Configure as variáveis privadas de `.env.example` apenas no servidor/ambiente de hospedagem. Não envie chaves secretas pelo chat nem use prefixo `NEXT_PUBLIC_` para elas. A chave publicável existente não substitui `SUPABASE_SECRET_KEY` (ou a alternativa legada service role).
3. No Mercado Pago Developers, use credenciais do vendedor de testes e o respectivo identificador em `MERCADO_PAGO_COLLECTOR_ID`. Tokens de testes podem começar com `APP_USR-`; o código consulta a conta e exige a marca `test_user` e o identificador esperado antes de reservar estoque ou abrir pagamento.
4. Defina `CHECKOUT_BASE_URL` como a origem HTTPS pública, sem caminho. Configure notificações de pagamentos em `/api/payments/webhook` e o segredo de assinatura correspondente. Não considere o retorno do navegador uma confirmação de pagamento.
5. Configure um agendador seguro para enviar POST a `/api/jobs/expire-orders`, por exemplo a cada minuto, com `Authorization: Bearer <CHECKOUT_CRON_SECRET>`. Gere um segredo aleatório de pelo menos 32 caracteres. Confirme que o agendador funciona antes de definir `CHECKOUT_EXPIRATION_JOB_READY=true`.
6. Para envio nacional, configure o Melhor Envio e as medidas por variante conforme `FRETE-NACIONAL.md`. A tabela manual por cidade/CEP permanece apenas como alternativa para uma operação local sem o integrador.
7. Somente após esses ajustes use `CHECKOUT_MODE=test`, reinicie o servidor e homologue o fluxo completo. Não existe ativação de pagamentos reais nesta versão.

## Frete automático e retirada futura

A cotação nacional do Melhor Envio foi implementada no servidor, com seleção de serviço e assinatura de valores no checkout. A disponibilização no ambiente hospedado depende da migration 005 e das medidas reais por variante. Veja configuração, testes e limitações em [FRETE-NACIONAL.md](FRETE-NACIONAL.md). Não há compra automática de etiquetas.

A retirada permanece registrada como evolução futura. Nenhuma opção de retirada aparece no checkout. Sua ativação dependerá de endereço, horários, preparação e fluxo administrativo próprios.

## Integridade e operação

- Preços, disponibilidade e entrega são calculados no servidor. Alteração do total após a revisão exige nova conferência; valores enviados pelo navegador não definem o preço cobrado.
- A reserva dura 30 minutos; criação e confirmação são idempotentes. Preferências de pagamento usam exclusão temporária e busca por referência para reduzir duplicação em novas tentativas.
- Webhooks exigem HMAC, janela de tempo e consulta autenticada ao provedor. São verificados vendedor, modo de testes, pedido, moeda e valor. Notificações repetidas não baixam estoque novamente.
- Aprovação tardia após liberação da reserva exige revisão administrativa e não baixa estoque automaticamente. Estornos e contestações são registrados; esta versão não solicita reembolsos nem repõe estoque automaticamente.
- Pedidos são consultáveis pela sessão HttpOnly do mesmo navegador por até 24 horas; o identificador na URL sozinho não permite acesso. Recuperação em outro dispositivo, conta de cliente e confirmação por e-mail ainda não estão implementadas.
- `/admin/pedidos` permite acompanhar pedidos e avançar a entrega de pedidos pagos. Não existe botão para simular pagamento aprovado.
- Antes de venda real, faltam homologação do provedor e de suas notificações, integração/regras definitivas de entrega, comunicação com o comprador e revisão da operação. Nem todos os cenários de testes do provedor emitem webhooks; isso precisa ser conferido no ambiente integrado.

## Verificação local

`npm test`, `npm run lint`, `npm run typecheck`, `npm run build` e `npm run test:checkout`.

Resultado desta entrega: 31 testes de lógica/PostgreSQL local e 8 testes de checkout no navegador aprovados; ESLint, TypeScript e build de produção aprovados. Capturas do navegador isolado em `artifacts/stage4-checkout-mobile.png` e `artifacts/stage4-checkout-desktop.png`.

O teste de checkout usa produção local na porta 3100, espera pagamentos desativados e verifica sete larguras: 320, 375, 390, 430, 768, 1024 e 1440 px. Testa visitante, endereço, revisão, bloqueio de compra sem configuração, privacidade dos endpoints e regras automatizadas WCAG A/AA em 390 px. Os testes de banco são isolados, sem modificar estoque no Supabase real. Isso não substitui homologação física em Android/iPhone e pagamento integrado.

Referências: [contas de testes Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/test-accounts), [notificações](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications), [cotação Melhor Envio](https://docs.melhorenvio.com.br/docs/cotacao-de-fretes).
