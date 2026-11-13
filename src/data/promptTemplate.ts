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
- **Opções de Molhos & Acompanhamentos:**
  - Suporte para escolha rápida de molhos por item na comanda (para espetinhos e porções) e venda avulsa em potes na categoria "🥫 Molhos":
    - *Chimichurri*
    - *Molho de Alho Cremoso*
    - *Molho Barbecue Caseiro*
    - *Vinagrete Clássico*
  - O molho escolhido fica registrado na comanda, na venda e no comprovante do WhatsApp.
- **Grade de Produtos:**
  - Categorias com filtros rápidos: "🍢 Espetinhos", "🍟 Porções (Tamanhos)", "🥫 Molhos", "🍺 Bebidas Geladas", "Todos".
  - Cards com foto apetitosa, nome claro, tag de gramatura/tamanho, preço e estoque.
  - Toque direto no tamanho desejado (Meia ou Inteira) adiciona imediatamente ao carrinho sem passos extras.
- **Carrinho e Fechamento:**
  - Visível lateralmente no computador ou como gaveta/barra inferior fixa no celular.
  - Total da venda calculado automaticamente em tempo real.
  - Botões rápidos de finalização:
    - **[💵 Dinheiro]:** Campo para valor recebido com cálculo automático de troco e atalhos rápidos (R$ 20, R$ 50, R$ 100).
    - **[📱 Pix]:** Exibe a chave Pix do proprietário para o cliente escanear ou copiar.
    - **[💳 Cartão Débito / Crédito].**
    - **[📒 Vender no Fiado (Caderneta)]:**
      - Abre busca instantânea dos clientes cadastrados (ou botão para cadastrar um novo cliente na hora em 15 segundos).
      - Ao selecionar o cliente, exibe seu limite de crédito e dívida atual.
      - Ao confirmar: baixa automaticamente o estoque, lança o valor na ficha de fiado do cliente e gera um comprovante digital pronto para ser enviado via WhatsApp caso o cliente queira.

### 2. Caderneta Digital de Fiado & Cobrança no WhatsApp (Módulo Central)
- **Painel Geral do Fiado:**
  - Métrica principal: "Total a Receber na Rua" (soma das dívidas de todos os clientes).
  - Número de clientes devedores ativos.
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

### 3. Fluxo de Caixa (Entradas & Saídas Diárias)
- **Indicadores do Dia:**
  - Total Entradas (Vendas em Dinheiro, Pix, Cartão + Recebimentos de Fiados anteriores).
  - Total Saídas (Despesas pagas no dia).
  - Saldo Líquido do Caixa em tempo real.
  - Total de Vendas que foram a Prazo (Fiado) no dia.
- **Lançamento Rápido de Saídas / Despesas:**
  - Formulário de 2 passos: Valor e Categoria (Carvão e Gelo, Carne e Insumos, Bebidas, Embalagens e Descartáveis, Retirada do Proprietário, Outros).
  - Descrição rápida (ex: "3 sacos de carvão vegetal").
- **Fechamento e Exportação:**
  - Tabela com histórico do dia e filtros por data.
  - Botão "Copiar Resumo do Dia para WhatsApp" para enviar o fechamento aos sócios ou arquivar.

### 4. Controle de Estoque
- Lista completa de produtos com: Preço de Custo, Preço de Venda, Margem de Lucro calculada, Quantidade Atual e Estoque Mínimo.
- Alerta visual evidente ("Reposição Urgente") para produtos abaixo do mínimo.
- Botões de reposição rápida com 1 clique (ex: "+6", "+12", "+24" latas).
- Cadastro e edição simples de novos produtos.

### 5. Configurações & Segurança dos Dados
- Nome do Espetinho / Bar.
- Cadastro da Chave Pix do dono (CPF, Celular, E-mail ou Chave Aleatória) e Nome do Favorecido (para ser injetado nas mensagens de cobrança automaticamente).
- Ferramenta de Backup: Botão "Baixar Backup dos Dados (JSON)" e "Restaurar Backup" para nunca perder as anotações do fiado.

---

## 💡 REQUISITOS DE USABILIDADE (UX)
1. **Velocidade:** Nenhum fluxo de venda pode exigir mais do que 3 toques na tela.
2. **Mobile First:** Em horário de pico com a churrasqueira cheia de fumaça, o dono não tem tempo de digitar coisas complexas. Priorize botões grandes e seleção visual.
3. **Sem Burocracia:** O cadastro de fiado não deve pedir CPF ou comprovante de residência; apenas Nome e WhatsApp são suficientes.
`;
