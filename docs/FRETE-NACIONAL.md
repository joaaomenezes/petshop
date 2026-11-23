# Frete nacional — Melhor Envio

A integração consulta preços e prazos de transportadoras para a origem configurada e o CEP informado no checkout. O token fica somente no servidor, em `.env.local` ou no gerenciador de segredos da hospedagem. Não coloque a credencial em `NEXT_PUBLIC_*`, no Git ou no chat.

## Instalação

1. Aplique `supabase/migrations/202611220005_national_shipping.sql` no SQL Editor do projeto, após a migration 004. A migration executa em uma transação: se houver erro, o lote é desfeito. Não reaplique a 004 nem execute a 005 duas vezes.
2. Configure `MELHOR_ENVIO_TOKEN`, `MELHOR_ENVIO_ORIGIN_POSTAL_CODE=18800332`, `MELHOR_ENVIO_ENVIRONMENT=production` e `MELHOR_ENVIO_CONTACT_EMAIL` no servidor. O ambiente sandbox usa outra conta/token e não fornece preços válidos de produção. Reinicie o processo Next após alterar variáveis.
3. Em cada variante de produto, informe **Peso com embalagem (g)** e **Largura, Altura e Comprimento da embalagem (cm)** de uma unidade preparada para envio. O peso líquido original permanece separado. Campos em branco significam ausência de medidas; nenhum tamanho padrão ou peso foi inventado.
4. No checkout, preencha identificação e endereço; a revisão apresenta opções de entrega e exige uma escolha antes de continuar ao pagamento. Consultas expiram em 10 minutos. Trocar endereço exige nova consulta e seleção.

Enquanto a migration 005 estiver pendente, os campos de envio ficam bloqueados no painel e a cotação informa indisponibilidade. O servidor também recusa salvar medidas contra um schema antigo para evitar uma confirmação falsa de gravação.

## Cálculo e integridade

A API recebe CEPs, dimensões em centímetros, peso em quilogramas, quantidades e valores unitários em reais. Nome, e-mail, telefone e endereço completo do comprador não são enviados ao Melhor Envio para cotação. São utilizados `custom_price` e `custom_delivery_time`, quando presentes, respeitando as configurações do integrador. Serviços com erro ou resposta inválida são descartados; ausência de opção não gera frete gratuito nem taxa alternativa.

As opções retornadas são assinadas com HMAC no servidor e vinculadas à sessão HttpOnly, endereço, CEP de origem, itens e validade. O comprador não determina preço, transportadora ou prazo enviando campos avulsos. Rotação do token invalida cotações anteriores. O pedido revalida preço, estoque, peso e dimensões dentro da transação de reserva e conserva o serviço escolhido e os volumes calculados como retrato da cotação. A API de criação de pedido usa credencial privada; não há permissão de criação pública de pedidos.

A consulta tem limite de seis solicitações por sessão/minuto e um armazenamento em memória limitado por processo. Antes de habilitar vendas reais em múltiplas instâncias, configure limitação distribuída/WAF, pois reiniciar o processo ou mudar de sessão contorna esse limite simples.

A tabela antiga de entrega local é ignorada no checkout enquanto o token do Melhor Envio estiver configurado. O painel informa o uso do frete nacional. Os pagamentos continuam exclusivamente no fluxo de testes e dependem das configurações privadas já descritas em `CHECKOUT.md`.

## Limites operacionais

Esta implementação **não compra etiquetas**, não adiciona fretes a um carrinho no provedor, não gera documentos fiscais e não agenda coletas. Esses fluxos dependem de dados fiscais/comerciais e de validação operacional posterior. Todo o Brasil é a abrangência pretendida; cada modalidade continua sujeita à cobertura, peso, dimensões e restrições da transportadora. Rações pesadas podem ter poucas opções ou frete elevado. O prazo exibido é uma estimativa após postagem; a operação deve definir também o prazo de preparação.

A consulta por produtos permite que o Melhor Envio calcule os volumes. Antes de vendas reais, homologue esse empacotamento com as embalagens efetivamente utilizadas, inclusive pedidos com múltiplos itens. Cobertura e preços reais não são garantidos por uma resposta simulada.

## Validação

Testes de PostgreSQL local cobrem persistência das medidas, bloqueio de medidas ausentes, reserva idempotente, total com frete, cotação expirada, alteração de medidas após cotar e permissões. Testes de assinatura verificam adulteração, sessão/endereço/origem incorretos e validade. Os testes de navegador usam respostas de frete controladas, sem criar pedidos nem comprar etiquetas, e verificam seleção, total e nova seleção após editar endereço em sete larguras.

A credencial real foi aceita anteriormente em uma consulta técnica com pacote de exemplo; isso não equivale a homologação dos produtos reais da loja. A migration 005 ainda precisa ser aplicada ao projeto hospedado e as medidas reais precisam ser cadastradas.

Referências: [cotação por produtos](https://docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos), [orientações de cotação](https://docs.melhorenvio.com.br/docs/cotacao-de-fretes).

Validação desta implementação: **39 testes de lógica/PostgreSQL local e 15 testes de checkout no navegador aprovados**, incluindo sete larguras, seleção de frete com respostas controladas e acessibilidade automatizada em 390 px. TypeScript, ESLint e build de produção aprovados. Esses resultados não representam uma compra/pagamento integrado com os produtos reais.
