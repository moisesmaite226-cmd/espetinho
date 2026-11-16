export const MASTER_PROMPT_TEXT = `# PROMPT COMPLETO: SISTEMA WEB DE GESTÃO PARA ESPETINHO, BEBIDAS & CADERNETA DE FIADO (COM COBRANÇA AUTOMATIZADA VIA WHATSAPP)

## 🎯 OBJETIVO DO PROJETO
Desenvolva uma aplicação web completa, moderna, responsiva (foco total em celulares e tablets no balcão) e intuitiva para um vendedor de comida de rua / bar / espetinho que comercializa espetinhos artesanais e bebidas geladas. O sistema precisa resolver 4 grandes dores do empreendedor:
1. Agilizar a venda no balcão (PDV rápido com poucos toques e cálculo de troco/Pix).
2. Gerenciar a caderneta de "FIADO" com cadastro rápido de clientes (Nome, Apelido e WhatsApp), saldo acumulado e COBRANÇA EM 1 CLIQUE NO WHATSAPP com mensagem pronta contendo o valor e a chave Pix.
3. Controlar o Fluxo de Caixa Diário (Entradas de vendas à vista, recebimento de fiados anteriores, e Saídas com despesas como carvão, gelo, carnes, bebidas e embalagens).
4. Controlar o Estoque de forma simplificada, alertando quando cervejas ou espetos estiverem perto de acabar e permitindo reposição rápida (ex: +12 latas, +24 cervejas).

---

## 🛠️ STACK TECNOLÓGICA RECOMENDADA
- **Frontend:** React com TypeScript, Tailwind CSS, Lucide Icons, Framer Motion (opcional para micro-interações suaves).
- **Armazenamento:** LocalStorage no navegador (com recurso de exportar/importar backup em JSON) ou Firebase Firestore para sincronização em nuvem multi-dispositivo.
- **Design System:** Tema escuro/neutro com detalhes quentes (âmbar/dourado/laranja brasa), tipografia de alta legibilidade (Plus Jakarta Sans ou similar), sem poluição visual, botões grandes adequados para dedos engordurados de churrasqueiro ou ambiente de bar.

---

## 📋 MÓDULOS E REQUISITOS DETALHADOS

### 1. Ponto de Venda Rápido (PDV Balcão) & Cardápio com Tamanho de Porções
- **Fotos Hiper-Realistas (Anti-IA):**
  - Todas as fotos de produtos devem parecer fotografias gastronômicas documentais autênticas de boteco / churrascaria brasileira (tábuas de madeira rústica, travessas de inox com limão fatiado, crosta dourada e crocante na mandioca e torresmo, gordurinha tostadinha no espeto de alcatra na brasa). Zero aspecto artificial, sem render 3D plástico.
- **Tamanho das Porções & Gramaturas:**
  - Suporte completo a múltiplos tamanhos de porção por produto com seletor ágil de 1 toque:
    - *Meia Porção (~300g a 350g · Serve 1 a 2 pessoas)*
    - *Porção Inteira (~600g a 700g · Serve 3 a 4 pessoas)*
    - *Porção Individual / Acompanhamento (~120g)*
  - Cada tamanho possui seu próprio preço e custo cadastrados (ex: Meia Mandioca R$ 18,00 | Inteira R$ 28,00).
  - O tamanho escolhido é impresso detalhadamente na comanda, no extrato do cliente e no comprovante do WhatsApp!
- **Molhos para Compra à Parte:**
  - Os molhos são vendidos exclusivamente como itens pagos (em potes individuais ou cumbucas para mesa) na categoria "🥫 Molhos" e com atalhos de adição paga na comanda:
    - *Chimichurri*
    - *Molho de Alho Cremoso*
    - *Molho Barbecue Caseiro*
    - *Vinagrete Clássico*
- **Grade de Produtos:**
  - Categorias rápidas: "Todos", "Espetinhos", "Porções (Tamanhos)", "Bebidas Geladas" (Cervejas, Coca-Cola, Guaraná, Sucos, Água e Energético juntos na mesma aba) e "Molhos", com ordenação por **Mais Vendidos** ou **Ordem Alfabética (A–Z)**.
  - Cards com foto realista autêntica de boteco, nome claro, tag de gramatura/volume, preço e estoque.
  - Toque direto no tamanho/volume desejado (Meia ou Inteira, Lata 350ml, Long Neck, Garrafa 600ml ou 2L) adiciona imediatamente ao carrinho sem passos extras.
- **Comandas & Mesas Simultâneas, Combos e Cozinha:**
  - Múltiplas abas abertas (Balcão, Mesa 1, Mesa 2, Viagem) salvas automaticamente.
  - Barra de Combos Prontos (1 toque) com desconto automático e baixa real no estoque.
  - Modo "Pedido p/ Churrasqueira" em letras grandes para leitura rápida na brasa.
  - Visível lateralmente no computador e com barra fixa inferior + gaveta rápida no celular.
  - Total da venda calculado automaticamente em tempo real com campo de desconto rápido.
  - Suporte a pagamento dividido em 2 formas ("Meio a Meio", ex: Pix + Dinheiro ou Pix + Fiado).
  - Botões rápidos de finalização:
    - **[💵 Dinheiro]:** Campo para valor pago pelo cliente com cálculo automático do troco a devolver e atalhos rápidos (Exato, R$ 10, R$ 20, R$ 50, R$ 100, R$ 200).
    - **[📱 Pix]:** Exibe a chave Pix do proprietário para o cliente escanear ou copiar.
    - **[💳 Cartão Débito / Crédito].**
    - **[📒 Vender no Fiado (Caderneta)]:**
      - Abre busca instantânea dos clientes cadastrados (ou botão para cadastrar um novo cliente na hora em 15 segundos).
      - Ao selecionar o cliente, exibe seu limite de crédito e dívida atual (exigindo autorização explícita se ultrapassar o limite).
      - Ao confirmar: baixa automaticamente o estoque, lança o valor na ficha de fiado do cliente e gera um comprovante digital pronto para ser enviado via WhatsApp caso o cliente queira.

### 2. Caderneta Digital de Fiado & Cobrança no WhatsApp (Módulo Central)
- **Painel Geral do Fiado:**
  - Métrica principal: "Total a Receber na Rua" (soma das dívidas de todos os clientes).
  - Indicadores de atraso ("Aberto há X dias", "Limite excedido") e filtro rápido "Atrasados +7d".
  - Busca por nome, apelido ("Marcão da Oficina", "Zé Borracheiro") ou telefone.
- **Cadastro Ágil de Cliente:**
  - Nome completo e Apelido / Referência.
  - Número de WhatsApp com máscara (ex: (11) 99999-8888).
  - Limite de crédito sugerido (ex: R$ 100,00).
  - Observações (ex: "Paga toda sexta-feira", "Amigo do vizinho").
- **Ficha do Cliente:**
  - Histórico de todas as compras fiadas (data, itens consumidos, valor).
  - Histórico de pagamentos/amortizações parciais.
  - Botão de **[💰 Receber Pagamento]**: permite quitar o total ou abater um valor parcial (ex: deve R$ 60, pagou R$ 20 no dinheiro, fica devendo R$ 40). O valor pago entra automaticamente no Caixa do Dia como "Recebimento de Fiado"!
- **DISPARO DE COBRANÇA VIA WHATSAPP COM 1 CLIQUE:**
  - Botão verde de destaque em cada cliente devedor.
  - Abre modal de cobrança com 3 modelos de mensagem pré-formatadas:
    1. *Amigável:* "Opa [Nome], tudo bem meu amigo? Passando aqui do [Nome do Espetinho] só para te mandar o resumo daquela conta de R$ XX,XX. Segue minha chave Pix [Chave Pix]. Quando puder me dá um alô! Tmj!"
    2. *Fechamento / Direto:* "Fala [Nome]! Segue o fechamento da sua caderneta no [Nome do Espetinho]: Total em aberto: R$ XX,XX referente a [itens]. Chave Pix: [Chave Pix]. Se puder transferir e enviar o comprovante, agradeço!"
    3. *Extrato Detalhado:* Lista item a item, datas e valor total.
  - Botão "Abrir WhatsApp" que dispara o link \`https://wa.me/55NUMERO?text=MENSAGEM_CODIFICADA\`, abrindo direto o aplicativo do WhatsApp do cliente com o texto já digitado, pronto só para apertar enviar!

### 3. Fluxo de Caixa & Finanças Reais (Lucro Líquido × Todos os Gastos × Fiado)
- **Filtros por Período & Estorno:**
  - Filtros rápidos para **Hoje**, **Últimos 7 dias**, **Este Mês**, **Datas Personalizadas** ou **Histórico Completo**.
  - Botão de **Estornar Venda** (devolve itens ao estoque, limpa entrada no caixa e abate dívida do fiado) e exclusão de lançamentos avulsos.
- **Separação Automática (Seu Saldo Real × Todos os Gastos × Fiado):**
  - Calcula o dinheiro que realmente entrou (Vendas Pagas + Fiados Recebidos) e desconta tanto o custo das vendas pagas quanto o **custo que saiu do bolso nas vendas fiadas** (pois a mercadoria já foi entregue sem receber dinheiro ainda).
  - Separa e contabiliza **todos os gastos sem excluir nenhum**: Água, Luz/Energia, Gás, Carvão, Gelo, **Meu Tempo / Mão de Obra** (com calculadora de horas × valor/hora), Carnes/Insumos, Bebidas, Embalagens e Aluguel/Taxas.
- **Indicadores do Dia:**
  - Total Entradas (Vendas em Dinheiro, Pix, Cartão + Recebimentos de Fiados anteriores).
  - Total de Saídas / Todos os Gastos detalhados por categoria.
  - Saldo Total em Caixa e Saldo Real no Bolso em tempo real.
- **Lançamento Rápido de Gastos (1 toque):**
  - Atalhos diretos para Água, Luz, Gás, Carvão, Gelo e Meu Tempo.
- **Fechamento e Exportação:**
  - Tabela com histórico do dia e detalhamento lucro × custo por venda (mostrando quando uma venda foi Fiado).
  - Botão "Copiar Resumo do Dia para WhatsApp" para enviar o fechamento completo aos sócios ou arquivar.

### 4. Controle de Estoque
- Lista completa de produtos com: Preço de Custo, Preço de Venda, Margem de Lucro calculada, Quantidade Atual e Estoque Mínimo.
- Alerta visual evidente ("Reposição Urgente") para produtos abaixo do mínimo.
- Botões de reposição rápida com 1 clique (ex: "+6", "+12", "+24" latas).
- Cadastro e edição simples de novos produtos, incluindo galeria de fotos reais e tamanhos/volumes personalizados.

### 5. Configurações, PWA Instalável & Segurança dos Dados
- Aplicativo instalável no celular/tablet (PWA) com funcionamento mesmo em internet instável.
- Nome do Espetinho / Bar.
- Cadastro da Chave Pix do dono (CPF, Celular, E-mail ou Chave Aleatória) e Nome do Favorecido (para ser injetado nas mensagens de cobrança automaticamente).
- Ferramenta de Backup: Botão "Baixar Backup dos Dados (JSON)" e "Restaurar Backup" para nunca perder as anotações do fiado.

---

## 💡 REQUISITOS DE USABILIDADE (UX)
1. **Velocidade:** Nenhum fluxo de venda pode exigir mais do que 3 toques na tela.
2. **Mobile First:** Em horário de pico com a churrasqueira cheia de fumaça, o dono não tem tempo de digitar coisas complexas. Priorize botões grandes e seleção visual.
3. **Sem Burocracia:** O cadastro de fiado não deve pedir CPF ou comprovante de residência; apenas Nome e WhatsApp são suficientes.
`;
