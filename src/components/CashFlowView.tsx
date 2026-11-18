import React, { useState } from 'react';
import { CashFlowEntry, CashFlowCategory, PaymentMethod, AppSettings, Sale, Product, Customer } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Minus, 
  Share2, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  CircleDollarSign,
  Wallet,
  PieChart,
  AlertTriangle,
  Clock,
  Droplets,
  Zap,
  Flame,
  Snowflake,
  Trash2,
  RotateCcw,
  Calendar,
  X,
  LockKeyhole,
  Unlock,
} from 'lucide-react';
import { ProfitAndTopItemsCharts } from './ProfitAndTopItemsCharts';
import { DailyGoalThermometer } from './DailyGoalThermometer';
import { DailyGoalSettings, RegisterShift } from '../types';

interface CashFlowViewProps {
  entries: CashFlowEntry[];
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  settings: AppSettings;
  dailyGoals?: DailyGoalSettings;
  todayNetProfit?: number;
  currentShift?: RegisterShift | null;
  onUpdateDailyGoals?: (goals: DailyGoalSettings) => void;
  onOpenRegisterShift?: () => void;
  onAddEntry: (entry: Omit<CashFlowEntry, 'id' | 'timestamp'>) => void;
  onDeleteEntry?: (entryId: string) => void;
  onReverseSale?: (saleId: string) => void;
}

export const CashFlowView: React.FC<CashFlowViewProps> = ({
  entries,
  sales,
  products,
  customers,
  settings,
  dailyGoals,
  todayNetProfit = 0,
  currentShift,
  onUpdateDailyGoals,
  onOpenRegisterShift,
  onAddEntry,
  onDeleteEntry,
  onReverseSale,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'saida' | 'entrada'>('saida');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CashFlowCategory>('compra_carvao');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [formError, setFormError] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [workHours, setWorkHours] = useState('6');
  const [hourlyRate, setHourlyRate] = useState('15');
  const [confirmReverseSaleId, setConfirmReverseSaleId] = useState<string | null>(null);
  const [confirmDeleteEntryId, setConfirmDeleteEntryId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Period filter: Hoje, 7 Dias, Este Mês, Personalizado ou Tudo
  const [filterPeriod, setFilterPeriod] = useState<'hoje' | '7dias' | 'mes' | 'personalizado' | 'todos'>('hoje');
  const [customStartDate, setCustomStartDate] = useState(todayStr);
  const [customEndDate, setCustomEndDate] = useState(todayStr);

  const matchesPeriod = (isoTimestamp: string): boolean => {
    const datePart = isoTimestamp.split('T')[0];
    if (filterPeriod === 'hoje') return datePart === todayStr;
    if (filterPeriod === 'todos') return true;
    if (filterPeriod === 'mes') return datePart.slice(0, 7) === todayStr.slice(0, 7);
    if (filterPeriod === '7dias') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];
      return datePart >= weekAgoStr && datePart <= todayStr;
    }
    if (filterPeriod === 'personalizado') {
      return datePart >= customStartDate && datePart <= customEndDate;
    }
    return true;
  };

  const periodLabelMap = {
    hoje: 'Hoje',
    '7dias': 'Últimos 7 dias',
    mes: 'Este Mês',
    personalizado: `${customStartDate} a ${customEndDate}`,
    todos: 'Histórico Completo',
  };

  const filteredEntries = entries
    .filter((e) => matchesPeriod(e.timestamp))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredSales = sales
    .filter((s) => matchesPeriod(s.timestamp))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Resolve cost and net profit for any sale (with fallback to catalog costPrice for historical sales)
  const resolveSaleBreakdown = (sale: Sale) => {
    let totalCost = 0;
    for (const item of sale.items) {
      let unitCost = item.unitCost;
      if (typeof unitCost !== 'number') {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          const matchedVariant = item.variantName && prod.variants
            ? prod.variants.find((v) => v.name === item.variantName)
            : undefined;
          unitCost = matchedVariant ? matchedVariant.costPrice : prod.costPrice;
        } else {
          unitCost = 0;
        }
      }
      totalCost += unitCost * item.quantity;
    }
    const revenue = sale.total;
    const netProfit = revenue - totalCost;
    return { revenue, totalCost, netProfit };
  };

  // Calculations for Cash Flow Ledger (Entradas e Saídas na Gaveta/Conta)
  const totalEntradas = filteredEntries
    .filter((e) => e.type === 'entrada')
    .reduce((sum, e) => sum + e.amount, 0);

  // Include ALL expenses without excluding any category (Água, Luz, Carvão, Gelo, Meu Tempo, etc.)
  const expenseEntries = filteredEntries.filter((e) => e.type === 'saida');
  const totalTodosGastos = expenseEntries.reduce((sum, e) => sum + e.amount, 0);
  const saldoCaixaFisico = totalEntradas - totalTodosGastos;

  const vendasVista = filteredEntries
    .filter((e) => e.type === 'entrada' && e.category === 'venda_vista')
    .reduce((sum, e) => sum + e.amount, 0);

  const recebimentosFiado = filteredEntries
    .filter((e) => e.type === 'entrada' && e.category === 'recebimento_fiado')
    .reduce((sum, e) => sum + e.amount, 0);

  // Calculations for Automatic Separation: Costs/Expenses + Fiado Out-of-Pocket vs Owner's Net Profit
  const splitTotals = filteredSales.reduce(
    (acc, sale) => {
      const b = resolveSaleBreakdown(sale);
      let fiadoAmount = 0;
      if (sale.splitPayment) {
        if (sale.splitPayment.primaryMethod === 'fiado') fiadoAmount += sale.splitPayment.primaryAmount;
        if (sale.splitPayment.secondaryMethod === 'fiado') fiadoAmount += sale.splitPayment.secondaryAmount;
      } else if (sale.paymentMethod === 'fiado') {
        fiadoAmount = b.revenue;
      }

      const clampedFiado = Math.min(b.revenue, Math.max(0, fiadoAmount));
      const paidRevenue = Math.max(0, b.revenue - clampedFiado);
      const fiadoRatio = b.revenue > 0 ? clampedFiado / b.revenue : (sale.paymentMethod === 'fiado' ? 1 : 0);
      const fiadoCost = b.totalCost * fiadoRatio;
      const paidCost = b.totalCost - fiadoCost;

      return {
        paidRevenue: acc.paidRevenue + paidRevenue,
        paidCost: acc.paidCost + paidCost,
        paidProfit: acc.paidProfit + (paidRevenue - paidCost),
        fiadoRevenue: acc.fiadoRevenue + clampedFiado,
        fiadoCost: acc.fiadoCost + fiadoCost,
      };
    },
    { paidRevenue: 0, paidCost: 0, paidProfit: 0, fiadoRevenue: 0, fiadoCost: 0 }
  );

  const paidSales = filteredSales.filter((s) => s.paymentMethod !== 'fiado');
  const fiadoSales = filteredSales.filter(
    (s) =>
      s.paymentMethod === 'fiado' ||
      s.splitPayment?.primaryMethod === 'fiado' ||
      s.splitPayment?.secondaryMethod === 'fiado'
  );

  const paidSalesTotals = {
    revenue: splitTotals.paidRevenue,
    cost: splitTotals.paidCost,
    profit: splitTotals.paidProfit,
  };

  const fiadoSalesTotals = {
    revenue: splitTotals.fiadoRevenue,
    cost: splitTotals.fiadoCost,
    profit: splitTotals.fiadoRevenue - splitTotals.fiadoCost,
  };

  const totalFiadoEmAbertoGeral = customers.reduce((sum, c) => sum + (c.totalDebt || 0), 0);

  // Money that went out of owner's pocket:
  // 1) Cost of paid items sold
  // 2) Cost of items given on FIADO (already left stock/pocket, 0 cash received yet!)
  // 3) All general expenses (Água, Luz, Gás, Carvão, Gelo, Meu Tempo, etc.)
  const custoItensPagos = paidSalesTotals.cost;
  const custoFiadoSaiuDoBolso = fiadoSalesTotals.cost;
  const totalGastosEProdutos = custoItensPagos + custoFiadoSaiuDoBolso + totalTodosGastos;

  // Real cash result after accounting for ALL expenses and fiado out-of-pocket cost
  const dinheiroQueEntrouDasVendas = paidSalesTotals.revenue + recebimentosFiado;
  const saldoRealNoBolso = dinheiroQueEntrouDasVendas - totalGastosEProdutos;
  const lucroBrutoVendasPagas = paidSalesTotals.profit;

  const baseParaPercentual = dinheiroQueEntrouDasVendas > 0 ? dinheiroQueEntrouDasVendas : 1;
  const pctDespesas = dinheiroQueEntrouDasVendas > 0
    ? Math.min(100, Math.max(0, (totalGastosEProdutos / baseParaPercentual) * 100))
    : 100;
  const pctLucro = dinheiroQueEntrouDasVendas > 0 ? Math.max(0, 100 - pctDespesas) : 0;

  const categoryLabels: Record<CashFlowCategory, string> = {
    venda_vista: 'Venda à Vista',
    recebimento_fiado: 'Recebimento de Fiado',
    suprimento_troco: 'Fundo de Troco / Aporte',
    conta_agua: 'Conta de Água',
    conta_luz: 'Luz / Energia Elétrica',
    gas_cozinha: 'Gás / Botijão',
    compra_carvao: 'Carvão',
    compra_gelo: 'Gelo',
    compra_carvao_gelo: 'Carvão & Gelo',
    mao_de_obra_tempo: 'Meu Tempo / Mão de Obra',
    compra_carne: 'Carnes & Insumos',
    compra_bebidas: 'Reposição Bebidas',
    embalagens_descartaveis: 'Embalagens / Descartáveis',
    aluguel_taxas: 'Aluguel / Ponto / Taxas',
    retirada_proprietario: 'Retirada Pró-Labore',
    outros: 'Outros Gastos',
  };

  // Group ALL recorded expenses by category so none is hidden
  const expensesByCategory = expenseEntries.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const handleOpenAddModal = (type: 'entrada' | 'saida', presetCategory?: CashFlowCategory, presetDesc?: string) => {
    setModalType(type);
    const chosenCat = presetCategory || (type === 'saida' ? 'compra_carvao' : 'suprimento_troco');
    setCategory(chosenCat);
    if (chosenCat === 'mao_de_obra_tempo') {
      const h = parseFloat(workHours) || 6;
      const r = parseFloat(hourlyRate) || 15;
      setAmount((h * r).toFixed(2));
      setDescription(presetDesc || `Meu tempo de trabalho (${h}h × R$ ${r.toFixed(2)}/h)`);
    } else {
      setAmount('');
      setDescription(presetDesc || '');
    }
    setFormError('');
    setIsAddModalOpen(true);
  };

  const applyTimeCalculation = (hoursStr: string, rateStr: string) => {
    setWorkHours(hoursStr);
    setHourlyRate(rateStr);
    const h = parseFloat(hoursStr.replace(',', '.')) || 0;
    const r = parseFloat(rateStr.replace(',', '.')) || 0;
    if (h > 0 && r > 0) {
      setAmount((h * r).toFixed(2));
      setDescription(`Meu tempo de trabalho (${h}h × ${formatCurrency(r)}/h)`);
    }
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount.replace(',', '.')) || 0;
    if (val <= 0 || !description.trim()) {
      setFormError('Informe um valor maior que zero e uma descrição válida.');
      return;
    }

    onAddEntry({
      type: modalType,
      category,
      amount: val,
      description: description.trim(),
      paymentMethod,
    });

    setFormError('');
    setIsAddModalOpen(false);
    setAmount('');
    setDescription('');
  };

  const handleCopyDailySummary = () => {
    const expenseLines = Object.entries(expensesByCategory)
      .map(([cat, val]) => `   • ${categoryLabels[cat as CashFlowCategory] || cat}: ${formatCurrency(val)}`)
      .join('\n');

    const summaryText = `📊 *FECHAMENTO FINANCEIRO REAL - ${settings.storeName}*
📅 Período: ${filterPeriod === 'hoje' ? new Date().toLocaleDateString('pt-BR') : periodLabelMap[filterPeriod]}

💰 *O QUE ENTROU DE VERDADE:* ${formatCurrency(dinheiroQueEntrouDasVendas)}
   • Vendas Pagas (Balcão): ${formatCurrency(paidSalesTotals.revenue)}
   • Fiados Recebidos: ${formatCurrency(recebimentosFiado)}

📒 *IMPACTO DO FIADO (DINHEIRO NA RUA):*
   • Vendido no Fiado (período): ${formatCurrency(fiadoSalesTotals.revenue)}
   • Custo que saiu do seu bolso no Fiado: - ${formatCurrency(custoFiadoSaiuDoBolso)}
   • Total a Receber na Praça (geral): ${formatCurrency(totalFiadoEmAbertoGeral)}

🔴 *TODOS OS GASTOS & CUSTOS:* ${formatCurrency(totalGastosEProdutos)}
   • Custo dos itens pagos: ${formatCurrency(custoItensPagos)}
   • Custo dos itens dados no fiado: ${formatCurrency(custoFiadoSaiuDoBolso)}
${expenseLines ? expenseLines : '   • Sem despesas avulsas lançadas'}

${saldoRealNoBolso >= 0 ? '🟢' : '🚨'} *RESULTADO REAL LÍQUIDO NO BOLSO:* ${formatCurrency(saldoRealNoBolso)}
-----------------------------------
Gerado pelo Espeto & Gelada Gestor 🔥`;

    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="space-y-6">
      {dailyGoals && onUpdateDailyGoals && (
        <DailyGoalThermometer
          todayProfit={todayNetProfit}
          goals={dailyGoals}
          onUpdateGoals={onUpdateDailyGoals}
          variant="expanded"
        />
      )}

      {/* PRIMARY PANEL: Real Financial Separation (Lucro Real no Bolso vs Todos os Gastos + Fiado que Saiu do Bolso) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-400" />
              <span>Finanças Reais: Seu Saldo Líquido × Todos os Gastos & Fiado</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Considera dinheiro recebido, todos os gastos (água, luz, carvão, gelo, seu tempo) e o custo que saiu do seu bolso no fiado.
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <span className="text-[11px] text-neutral-400 block">Dinheiro que Realmente Entrou</span>
            <span className="text-base font-bold font-mono text-white tabular-nums">
              {formatCurrency(dinheiroQueEntrouDasVendas)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Real Net Profit / Result in Pocket */}
          <div className={`rounded-xl p-4 flex flex-col justify-between border ${
            saldoRealNoBolso >= 0
              ? 'bg-emerald-950/30 border-emerald-700/60'
              : 'bg-rose-950/35 border-rose-700/70'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider block ${
                  saldoRealNoBolso >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}>
                  Seu Saldo Real no Bolso
                </span>
                <p className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums mt-1.5 ${
                  saldoRealNoBolso >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatCurrency(saldoRealNoBolso)}
                </p>
              </div>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border tabular-nums ${
                saldoRealNoBolso >= 0
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}>
                {saldoRealNoBolso >= 0 ? `${pctLucro.toFixed(0)}% limpo` : 'No prejuízo'}
              </span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-neutral-800/70 space-y-1 text-[11px] text-neutral-300 font-mono">
              <div className="flex justify-between">
                <span className="text-neutral-400">Lucro bruto (vendas pagas):</span>
                <span className="text-emerald-400">+ {formatCurrency(lucroBrutoVendasPagas)}</span>
              </div>
              {recebimentosFiado > 0 && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Fiados recebidos hoje:</span>
                  <span className="text-emerald-400">+ {formatCurrency(recebimentosFiado)}</span>
                </div>
              )}
              {custoFiadoSaiuDoBolso > 0 && (
                <div className="flex justify-between">
                  <span className="text-amber-300">Saiu do bolso (Fiado):</span>
                  <span className="text-rose-400">- {formatCurrency(custoFiadoSaiuDoBolso)}</span>
                </div>
              )}
              {totalTodosGastos > 0 && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Gastos gerais lançados:</span>
                  <span className="text-rose-400">- {formatCurrency(totalTodosGastos)}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. ALL Expenses & Production Costs */}
          <div className="bg-rose-950/20 border border-rose-800/50 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-300 block">
                  Todos os Gastos & Custos
                </span>
                <p className="text-2xl sm:text-3xl font-bold font-mono text-rose-400 tabular-nums mt-1.5">
                  {formatCurrency(totalGastosEProdutos)}
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 tabular-nums">
                Sem exceção
              </span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-rose-900/40 space-y-1 text-[11px] text-rose-200/80 font-mono">
              <div className="flex justify-between">
                <span>Custo itens pagos:</span>
                <strong className="text-rose-300">{formatCurrency(custoItensPagos)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Custo itens no Fiado:</span>
                <strong className="text-rose-300">{formatCurrency(custoFiadoSaiuDoBolso)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Gastos (água, luz, carvão, tempo...):</span>
                <strong className="text-rose-300">{formatCurrency(totalTodosGastos)}</strong>
              </div>
            </div>
          </div>

          {/* 3. Fiado Impact (Dinheiro que saiu do bolso e está na rua) */}
          <div className="bg-amber-950/20 border border-amber-700/50 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Dinheiro Preso no Fiado</span>
                </span>
                <p className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 tabular-nums mt-1.5">
                  {formatCurrency(totalFiadoEmAbertoGeral)}
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Na rua
              </span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-amber-800/40 space-y-1 text-[11px] text-amber-100/80">
              <p>
                No período: vendeu <strong className="font-mono text-white">{formatCurrency(fiadoSalesTotals.revenue)}</strong> no fiado e <strong className="font-mono text-rose-300">{formatCurrency(custoFiadoSaiuDoBolso)} saiu do seu bolso</strong> em mercadoria.
              </p>
              <p className="text-amber-300/80">
                Enquanto não cobrar no WhatsApp, esse custo pesa no seu caixa real.
              </p>
            </div>
          </div>
        </div>

        {/* Visual Split Bar */}
        {dinheiroQueEntrouDasVendas > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono text-neutral-400">
              <span>Saldo real livre: {pctLucro.toFixed(0)}%</span>
              <span>Comprometido com gastos + fiado: {pctDespesas.toFixed(0)}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-neutral-950 overflow-hidden flex border border-neutral-800">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${pctLucro}%` }}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-300"
                style={{ width: `${pctDespesas}%` }}
              />
            </div>
          </div>
        )}

        {/* Complete Breakdown of ALL Logged Expenses by Category */}
        {Object.keys(expensesByCategory).length > 0 && (
          <div className="pt-3 border-t border-neutral-800 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
              Detalhamento de Todos os Gastos Lançados ({formatCurrency(totalTodosGastos)}):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {Object.entries(expensesByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, total]) => (
                  <div
                    key={cat}
                    className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 flex flex-col justify-between"
                  >
                    <span className="text-[11px] text-neutral-400 truncate">
                      {categoryLabels[cat as CashFlowCategory] || cat}
                    </span>
                    <span className="text-sm font-mono font-bold text-rose-400 tabular-nums mt-0.5">
                      {formatCurrency(total)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Strip (Physical Cash Flow) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Entradas */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Entradas no Caixa ({periodLabelMap[filterPeriod]})</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-400 tabular-nums mt-2">
            {formatCurrency(totalEntradas)}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-1">
            <span>Balcão: {formatCurrency(vendasVista)}</span>
            <span>·</span>
            <span>Fiados pagos: {formatCurrency(recebimentosFiado)}</span>
          </div>
        </div>

        {/* Saídas */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Saídas / Todos os Gastos</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-rose-400 tabular-nums mt-2">
            {formatCurrency(totalTodosGastos)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">
            Água, luz, gás, carvão, gelo, seu tempo e compras
          </p>
        </div>

        {/* Saldo Total em Caixa */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Saldo Total em Caixa</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <CircleDollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-bold font-mono tabular-nums mt-2 ${
            saldoCaixaFisico >= 0 ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {formatCurrency(saldoCaixaFisico)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">
            Dinheiro em gaveta/conta (entradas − todas as saídas)
          </p>
        </div>

      </div>

      {/* Control Strip */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Period Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap bg-neutral-950 p-1 rounded-lg border border-neutral-800">
              <button
                onClick={() => setFilterPeriod('hoje')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  filterPeriod === 'hoje'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setFilterPeriod('7dias')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  filterPeriod === '7dias'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                7 Dias
              </button>
              <button
                onClick={() => setFilterPeriod('mes')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  filterPeriod === 'mes'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Este Mês
              </button>
              <button
                onClick={() => setFilterPeriod('personalizado')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 whitespace-nowrap ${
                  filterPeriod === 'personalizado'
                    ? 'bg-neutral-800 text-amber-300 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3 h-3" />
                Datas
              </button>
              <button
                onClick={() => setFilterPeriod('todos')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  filterPeriod === 'todos'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Tudo
              </button>
            </div>

            {filterPeriod === 'personalizado' && (
              <div className="flex items-center gap-1.5 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono text-[11px]"
                />
                <span className="text-neutral-500">até</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono text-[11px]"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenRegisterShift && (
              <button
                type="button"
                onClick={onOpenRegisterShift}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors border ${
                  currentShift?.status === 'open'
                    ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 border-amber-400'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {currentShift?.status === 'open' ? (
                  <>
                    <LockKeyhole className="w-3.5 h-3.5" />
                    <span>Conferir & Fechar Caixa</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Abrir Caixa do Dia</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleCopyDailySummary}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors border border-neutral-700"
              title="Copiar resumo formatado para enviar no WhatsApp"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedSummary ? 'Fechamento Copiado!' : 'Copiar Fechamento WhatsApp'}</span>
            </button>

            <button
              onClick={() => handleOpenAddModal('saida')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg transition-colors"
            >
              <Minus className="w-4 h-4" />
              <span>- Lançar Gasto</span>
            </button>

            <button
              onClick={() => handleOpenAddModal('entrada')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Lançar Entrada</span>
            </button>
          </div>
        </div>

        {/* 1-Click Quick Expense Launchers (Água, Luz, Gás, Carvão, Gelo, Meu Tempo) */}
        <div className="pt-2.5 border-t border-neutral-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-semibold text-neutral-400 whitespace-nowrap shrink-0">
            Lançar gasto rápido:
          </span>
          <button
            type="button"
            onClick={() => handleOpenAddModal('saida', 'conta_agua', 'Conta / uso de água do dia')}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-neutral-950 hover:bg-neutral-800 text-sky-300 border border-neutral-800 rounded-lg whitespace-nowrap shrink-0"
          >
            <Droplets className="w-3 h-3" />
            <span>Água</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAddModal('saida', 'conta_luz', 'Energia / luz elétrica do dia')}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-neutral-950 hover:bg-neutral-800 text-yellow-300 border border-neutral-800 rounded-lg whitespace-nowrap shrink-0"
          >
            <Zap className="w-3 h-3" />
            <span>Luz</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAddModal('saida', 'gas_cozinha', 'Gás de cozinha / fogão')}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-neutral-950 hover:bg-neutral-800 text-orange-300 border border-neutral-800 rounded-lg whitespace-nowrap shrink-0"
          >
            <Flame className="w-3 h-3" />
            <span>Gás</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAddModal('saida', 'compra_carvao', 'Carvão vegetal')}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-neutral-950 hover:bg-neutral-800 text-amber-300 border border-neutral-800 rounded-lg whitespace-nowrap shrink-0"
          >
            <Flame className="w-3 h-3" />
            <span>Carvão</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAddModal('saida', 'compra_gelo', 'Saco de gelo')}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-neutral-950 hover:bg-neutral-800 text-cyan-300 border border-neutral-800 rounded-lg whitespace-nowrap shrink-0"
          >
            <Snowflake className="w-3 h-3" />
            <span>Gelo</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAddModal('saida', 'mao_de_obra_tempo')}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-neutral-950 hover:bg-neutral-800 text-emerald-300 border border-neutral-800 rounded-lg whitespace-nowrap shrink-0"
          >
            <Clock className="w-3 h-3" />
            <span>Meu Tempo</span>
          </button>
        </div>
      </div>

      {/* Interactive Profit & Top-Selling Items Charts */}
      <ProfitAndTopItemsCharts
        sales={filteredSales}
        entries={filteredEntries}
        products={products}
        filterPeriod={filterPeriod}
        periodLabel={periodLabelMap[filterPeriod]}
        onSelectAllPeriod={() => setFilterPeriod('todos')}
      />

      {/* Per-Sale Profit vs Cost Breakdown */}
      {filteredSales.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-amber-400" />
              <span>Separação por Venda ({filteredSales.length})</span>
            </h3>
            <span className="text-[11px] text-neutral-500">
              Total cobrado = Parte das despesas + Seu lucro líquido
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/70 border-b border-neutral-800 text-neutral-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Venda / Itens</th>
                  <th className="px-4 py-2.5">Pagamento</th>
                  <th className="px-4 py-2.5 text-right">Cobrado</th>
                  <th className="px-4 py-2.5 text-right text-rose-300">Despesas / Custo</th>
                  <th className="px-4 py-2.5 text-right text-emerald-300">Seu Lucro</th>
                  {onReverseSale && <th className="px-4 py-2.5 text-right">Estornar</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70">
                {filteredSales.map((sale) => {
                  const breakdown = resolveSaleBreakdown(sale);
                  const isFiado = sale.paymentMethod === 'fiado';
                  const isConfirming = confirmReverseSaleId === sale.id;
                  return (
                    <tr key={sale.id} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-neutral-200 truncate max-w-[260px]">
                          {sale.tableLabel && (
                            <span className="text-amber-400 mr-1.5">[{sale.tableLabel}]</span>
                          )}
                          {sale.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500">
                          {formatDateTime(sale.timestamp)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          isFiado
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}>
                          {sale.splitPayment
                            ? `${sale.splitPayment.primaryMethod} + ${sale.splitPayment.secondaryMethod}`
                            : sale.paymentMethod.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-white tabular-nums">
                        {formatCurrency(breakdown.revenue)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-rose-400 tabular-nums">
                        {formatCurrency(breakdown.totalCost)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-400 tabular-nums">
                        + {formatCurrency(breakdown.netProfit)}
                      </td>
                      {onReverseSale && (
                        <td className="px-4 py-2.5 text-right">
                          {isConfirming ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onReverseSale(sale.id);
                                  setConfirmReverseSaleId(null);
                                }}
                                className="px-2 py-1 text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmReverseSaleId(null)}
                                className="px-2 py-1 text-[10px] bg-neutral-800 text-neutral-300 rounded"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmReverseSaleId(sale.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-neutral-800 hover:bg-rose-950/60 hover:text-rose-300 text-neutral-400 rounded transition-colors"
                              title="Cancelar venda, devolver itens ao estoque e estornar do caixa"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Estornar</span>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Movements Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
            Livro de Caixa ({filteredEntries.length} lançamentos)
          </h3>
          <span className="text-[11px] text-neutral-500">
            Ordenado pelos mais recentes
          </span>
        </div>

        <div className="divide-y divide-neutral-800/80 overflow-x-auto">
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-xs">
              Nenhuma movimentação registrada para este período.
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isIncome = entry.type === 'entrada';
              const isConfirmingDel = confirmDeleteEntryId === entry.id;

              return (
                <div
                  key={entry.id}
                  className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-neutral-800/40 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isIncome 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-200 truncate">
                        {entry.description}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                        <span>{categoryLabels[entry.category] || entry.category}</span>
                        <span>·</span>
                        <span className="font-mono">{formatDateTime(entry.timestamp)}</span>
                        {entry.paymentMethod && (
                          <>
                            <span>·</span>
                            <span className="uppercase text-[10px]">{entry.paymentMethod}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 pl-2">
                    <span className={`text-sm font-mono font-bold tabular-nums ${
                      isIncome ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isIncome ? `+ ${formatCurrency(entry.amount)}` : `- ${formatCurrency(entry.amount)}`}
                    </span>

                    {onDeleteEntry && (
                      isConfirmingDel ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteEntry(entry.id);
                              setConfirmDeleteEntryId(null);
                            }}
                            className="px-2 py-1 text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded"
                          >
                            Excluir
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteEntryId(null)}
                            className="px-1.5 py-1 text-[10px] bg-neutral-800 text-neutral-300 rounded"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteEntryId(entry.id)}
                          className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 rounded transition-colors"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Entry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleSaveEntry}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {modalType === 'saida' ? (
                  <>
                    <TrendingDown className="w-5 h-5 text-rose-400" />
                    <span>Lançar Saída / Despesa</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <span>Lançar Entrada no Caixa</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Valor (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-sm">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.50"
                    required
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-base font-mono bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Categoria *
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const nextCat = e.target.value as CashFlowCategory;
                    setCategory(nextCat);
                    if (nextCat === 'mao_de_obra_tempo') {
                      applyTimeCalculation(workHours, hourlyRate);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white"
                >
                  {modalType === 'saida' ? (
                    <>
                      <option value="conta_agua">💧 Água (conta / consumo)</option>
                      <option value="conta_luz">⚡ Luz / Energia Elétrica</option>
                      <option value="gas_cozinha">🔥 Gás de Cozinha / Fogão</option>
                      <option value="compra_carvao">🪵 Carvão Vegetal</option>
                      <option value="compra_gelo">🧊 Gelo</option>
                      <option value="mao_de_obra_tempo">⏱️ Meu Tempo / Mão de Obra (Diária)</option>
                      <option value="compra_carne">🥩 Carnes & Insumos</option>
                      <option value="compra_bebidas">🍺 Reposição de Bebidas</option>
                      <option value="embalagens_descartaveis">🥡 Embalagens & Descartáveis</option>
                      <option value="aluguel_taxas">🏠 Aluguel / Ponto / Taxas</option>
                      <option value="compra_carvao_gelo">🪵 Carvão & Gelo (Combo)</option>
                      <option value="retirada_proprietario">💵 Retirada Pró-Labore</option>
                      <option value="outros">🧾 Outros Gastos</option>
                    </>
                  ) : (
                    <>
                      <option value="suprimento_troco">Fundo de Troco / Aporte Inicial</option>
                      <option value="venda_vista">Venda Balcão Avulsa</option>
                      <option value="recebimento_fiado">Recebimento de Fiado</option>
                      <option value="outros">Outra Entrada</option>
                    </>
                  )}
                </select>
              </div>

              {modalType === 'saida' && category === 'mao_de_obra_tempo' && (
                <div className="bg-neutral-950 border border-emerald-800/50 rounded-xl p-3 space-y-2">
                  <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Calcular valor do seu tempo trabalhado:</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-0.5">Horas trabalhadas</label>
                      <input
                        type="number"
                        step="0.5"
                        value={workHours}
                        onChange={(e) => applyTimeCalculation(e.target.value, hourlyRate)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-0.5">Valor da sua hora (R$)</label>
                      <input
                        type="number"
                        step="1"
                        value={hourlyRate}
                        onChange={(e) => applyTimeCalculation(workHours, e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Descrição do Lançamento *
                </label>
                <input
                  type="text"
                  required
                  placeholder={modalType === 'saida' ? 'Ex: Carvão, gelo, conta de luz, meu tempo...' : 'Ex: Fundo de troco para início do dia'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('dinheiro')}
                    className={`py-1.5 rounded-lg border ${
                      paymentMethod === 'dinheiro'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    💵 Dinheiro
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`py-1.5 rounded-lg border ${
                      paymentMethod === 'pix'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    📱 Pix
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cartao_debito')}
                    className={`py-1.5 rounded-lg border ${
                      paymentMethod === 'cartao_debito'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    💳 Cartão
                  </button>
                </div>
              </div>
              {formError && (
                <div className="p-2.5 bg-rose-950/40 border border-rose-800 rounded-lg text-xs text-rose-300">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`px-5 py-2 text-xs font-bold text-neutral-950 rounded-xl shadow-md ${
                  modalType === 'saida' ? 'bg-rose-500 hover:bg-rose-400' : 'bg-emerald-500 hover:bg-emerald-400'
                }`}
              >
                Confirmar Lançamento
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
