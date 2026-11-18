import React, { useState, useMemo } from 'react';
import { CashFlowEntry, Product, RegisterShift, Sale, AppSettings } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import {
  LockKeyhole,
  Unlock,
  X,
  CheckCircle2,
  Copy,
  Share2,
  AlertTriangle,
  History,
} from 'lucide-react';

interface RegisterShiftModalProps {
  currentShift: RegisterShift | null;
  shiftHistory: RegisterShift[];
  entries: CashFlowEntry[];
  sales: Sale[];
  products: Product[];
  settings: AppSettings;
  onOpenShift: (openingCash: number, recordCashFlowEntry: boolean) => void;
  onCloseShift: (summary: {
    countedCash: number;
    expectedCashAtClose: number;
    totalSalesRevenue: number;
    netProfitAtClose: number;
    notes?: string;
  }) => void;
  onClose: () => void;
}

export const RegisterShiftModal: React.FC<RegisterShiftModalProps> = ({
  currentShift,
  shiftHistory,
  entries,
  sales,
  products,
  settings,
  onOpenShift,
  onCloseShift,
  onClose,
}) => {
  const [openingInput, setOpeningInput] = useState('150,00');
  const [recordOpeningInCashFlow, setRecordOpeningInCashFlow] = useState(true);
  const [countedCashInput, setCountedCashInput] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Window: from current shift openedAt (if open) OR start of today
  const windowStartTs = currentShift?.status === 'open'
    ? new Date(currentShift.openedAt).getTime()
    : new Date(`${todayStr}T00:00:00`).getTime();

  const shiftStats = useMemo(() => {
    const windowSales = sales.filter((s) => new Date(s.timestamp).getTime() >= windowStartTs);
    const windowEntries = entries.filter((e) => new Date(e.timestamp).getTime() >= windowStartTs);

    let pixTotal = 0;
    let cardTotal = 0;
    let cashSalesTotal = 0;
    let fiadoTotal = 0;
    let productCostTotal = 0;

    for (const s of windowSales) {
      // Cost
      for (const item of s.items) {
        let unitCost = item.unitCost;
        if (typeof unitCost !== 'number') {
          const p = products.find((prod) => prod.id === item.productId);
          unitCost = p?.costPrice ?? 0;
        }
        productCostTotal += unitCost * item.quantity;
      }

      if (s.splitPayment) {
        const legs = [
          { m: s.splitPayment.primaryMethod, a: s.splitPayment.primaryAmount },
          { m: s.splitPayment.secondaryMethod, a: s.splitPayment.secondaryAmount },
        ];
        for (const leg of legs) {
          if (leg.m === 'pix') pixTotal += leg.a;
          else if (leg.m === 'dinheiro') cashSalesTotal += leg.a;
          else if (leg.m === 'fiado') fiadoTotal += leg.a;
          else cardTotal += leg.a;
        }
      } else {
        if (s.paymentMethod === 'pix') pixTotal += s.total;
        else if (s.paymentMethod === 'dinheiro') cashSalesTotal += s.total;
        else if (s.paymentMethod === 'fiado') fiadoTotal += s.total;
        else cardTotal += s.total;
      }
    }

    const fiadoReceivedCash = windowEntries
      .filter((e) => e.type === 'entrada' && e.category === 'recebimento_fiado' && e.paymentMethod === 'dinheiro')
      .reduce((s, e) => s + e.amount, 0);

    const fiadoReceivedPixCard = windowEntries
      .filter((e) => e.type === 'entrada' && e.category === 'recebimento_fiado' && e.paymentMethod !== 'dinheiro')
      .reduce((s, e) => s + e.amount, 0);

    const cashOutflows = windowEntries
      .filter((e) => e.type === 'saida' && (e.paymentMethod === 'dinheiro' || !e.paymentMethod))
      .reduce((s, e) => s + e.amount, 0);

    const allOutflows = windowEntries
      .filter((e) => e.type === 'saida')
      .reduce((s, e) => s + e.amount, 0);

    const openingCash = currentShift?.status === 'open' ? currentShift.openingCash : 0;
    const expectedCashInDrawer = openingCash + cashSalesTotal + fiadoReceivedCash - cashOutflows;
    const totalSalesRevenue = pixTotal + cardTotal + cashSalesTotal + fiadoTotal;
    const paidRevenue = pixTotal + cardTotal + cashSalesTotal + fiadoReceivedCash + fiadoReceivedPixCard;
    const netProfitEstimate = paidRevenue - productCostTotal - allOutflows;

    return {
      salesCount: windowSales.length,
      pixTotal,
      cardTotal,
      cashSalesTotal,
      fiadoTotal,
      fiadoReceivedCash,
      fiadoReceivedPixCard,
      cashOutflows,
      allOutflows,
      openingCash,
      expectedCashInDrawer,
      totalSalesRevenue,
      netProfitEstimate,
    };
  }, [sales, entries, products, windowStartTs, currentShift]);

  const parsedCounted = parseFloat(countedCashInput.replace(',', '.'));
  const hasCounted = countedCashInput.trim().length > 0 && Number.isFinite(parsedCounted);
  const drawerDiff = hasCounted ? parsedCounted - shiftStats.expectedCashInDrawer : 0;

  const buildCloseSummaryText = () => {
    const lines = [
      `📊 *FECHAMENTO DE CAIXA — ${settings.storeName.toUpperCase()}*`,
      `🗓️ ${new Date().toLocaleDateString('pt-BR')} · ${shiftStats.salesCount} vendas`,
      '',
      `💵 Dinheiro (Vendas): ${formatCurrency(shiftStats.cashSalesTotal)}`,
      `📱 Pix: ${formatCurrency(shiftStats.pixTotal)}`,
      `💳 Cartão: ${formatCurrency(shiftStats.cardTotal)}`,
      `📒 Anotado no Fiado: ${formatCurrency(shiftStats.fiadoTotal)}`,
      `🤝 Fiado Recebido Hoje: ${formatCurrency(shiftStats.fiadoReceivedCash + shiftStats.fiadoReceivedPixCard)}`,
      '',
      `🏦 Troco Inicial: ${formatCurrency(shiftStats.openingCash)}`,
      `💸 Saídas/Despesas Gerais: ${formatCurrency(shiftStats.allOutflows)}`,
      `🧮 Esperado na Gaveta: ${formatCurrency(shiftStats.expectedCashInDrawer)}`,
      ...(hasCounted
        ? [
            `✅ Contado na Gaveta: ${formatCurrency(parsedCounted)} (${
              Math.abs(drawerDiff) < 0.01
                ? 'Bateu exato!'
                : drawerDiff > 0
                ? `Sobra ${formatCurrency(drawerDiff)}`
                : `Falta ${formatCurrency(Math.abs(drawerDiff))}`
            })`,
          ]
        : []),
      '',
      `🔥 *Resultado Líquido Estimado:* ${formatCurrency(shiftStats.netProfitEstimate)}`,
      ...(closeNotes.trim() ? [`📝 Obs: ${closeNotes.trim()}`] : []),
    ];
    return lines.join('\n');
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(buildCloseSummaryText());
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleOpenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Math.max(0, parseFloat(openingInput.replace(',', '.')) || 0);
    onOpenShift(val, recordOpeningInCashFlow);
  };

  const handleCloseSubmit = () => {
    const counted = hasCounted ? parsedCounted : shiftStats.expectedCashInDrawer;
    onCloseShift({
      countedCash: counted,
      expectedCashAtClose: shiftStats.expectedCashInDrawer,
      totalSalesRevenue: shiftStats.totalSalesRevenue,
      netProfitAtClose: shiftStats.netProfitEstimate,
      notes: closeNotes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl p-5 sm:p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                currentShift?.status === 'open'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {currentShift?.status === 'open' ? (
                <Unlock className="w-5 h-5" />
              ) : (
                <LockKeyhole className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {currentShift?.status === 'open'
                  ? 'Conferência & Fechamento de Caixa'
                  : 'Abertura de Caixa / Novo Turno'}
              </h3>
              <p className="text-xs text-neutral-400">
                {currentShift?.status === 'open'
                  ? `Turno aberto em ${formatDateTime(currentShift.openedAt)}`
                  : 'Informe o troco inicial da gaveta para começar o turno'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Open Shift Form if no open shift */}
        {!currentShift || currentShift.status !== 'open' ? (
          <form onSubmit={handleOpenSubmit} className="space-y-4">
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
              <label className="text-xs font-semibold text-neutral-300 block">
                Fundo de Troco Inicial na Gaveta (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={openingInput}
                onChange={(e) => setOpeningInput(e.target.value)}
                className="w-full px-3.5 py-2.5 text-lg bg-neutral-900 border border-neutral-700 rounded-xl text-amber-400 font-mono font-bold tabular-nums"
              />
              <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordOpeningInCashFlow}
                  onChange={(e) => setRecordOpeningInCashFlow(e.target.checked)}
                  className="rounded border-neutral-700 text-amber-500"
                />
                <span>Registrar suprimento de troco como entrada no Fluxo de Caixa</span>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold bg-neutral-800 text-neutral-300 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl flex items-center gap-1.5"
              >
                <Unlock className="w-4 h-4" />
                <span>Abrir Caixa do Dia</span>
              </button>
            </div>
          </form>
        ) : (
          /* Close Shift Reconciliation View */
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                <span className="text-[10px] text-neutral-400 block">Dinheiro (Vendas)</span>
                <span className="text-sm font-mono font-bold text-emerald-400 tabular-nums">
                  {formatCurrency(shiftStats.cashSalesTotal)}
                </span>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                <span className="text-[10px] text-neutral-400 block">Pix</span>
                <span className="text-sm font-mono font-bold text-sky-400 tabular-nums">
                  {formatCurrency(shiftStats.pixTotal)}
                </span>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                <span className="text-[10px] text-neutral-400 block">Cartão</span>
                <span className="text-sm font-mono font-bold text-amber-400 tabular-nums">
                  {formatCurrency(shiftStats.cardTotal)}
                </span>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                <span className="text-[10px] text-neutral-400 block">Fiado Anotado</span>
                <span className="text-sm font-mono font-bold text-rose-400 tabular-nums">
                  {formatCurrency(shiftStats.fiadoTotal)}
                </span>
              </div>
            </div>

            {/* Drawer reconciliation */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-neutral-400">
                  Troco Inicial ({formatCurrency(shiftStats.openingCash)}) + Dinheiro ({formatCurrency(shiftStats.cashSalesTotal + shiftStats.fiadoReceivedCash)}) − Saídas em dinheiro ({formatCurrency(shiftStats.cashOutflows)})
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                <span className="text-xs font-bold text-white">Esperado na Gaveta Agora:</span>
                <span className="text-lg font-mono font-bold text-amber-400 tabular-nums">
                  {formatCurrency(shiftStats.expectedCashInDrawer)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                    Dinheiro Contado na Gaveta (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={shiftStats.expectedCashInDrawer.toFixed(2).replace('.', ',')}
                    value={countedCashInput}
                    onChange={(e) => setCountedCashInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono font-bold tabular-nums"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  {hasCounted ? (
                    <div
                      className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-between ${
                        Math.abs(drawerDiff) < 0.01
                          ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                          : drawerDiff > 0
                          ? 'bg-sky-950/40 border-sky-700/60 text-sky-300'
                          : 'bg-rose-950/40 border-rose-700/60 text-rose-300'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {Math.abs(drawerDiff) < 0.01 ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                        {Math.abs(drawerDiff) < 0.01
                          ? 'Gaveta Bateu!'
                          : drawerDiff > 0
                          ? 'Sobra no Caixa:'
                          : 'Falta no Caixa:'}
                      </span>
                      {Math.abs(drawerDiff) >= 0.01 && (
                        <span className="font-mono tabular-nums">
                          {drawerDiff > 0 ? '+' : '-'}
                          {formatCurrency(Math.abs(drawerDiff))}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400">
                      Conte as notas e moedas para conferir se houve sobra ou falta.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">
                  Observações do fechamento (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Movimento forte de sexta, faltou carvão às 22h..."
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedSummary ? 'Resumo Copiado!' : 'Copiar Resumo'}</span>
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(buildCloseSummaryText())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>

              <button
                type="button"
                onClick={handleCloseSubmit}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 ml-auto"
              >
                <LockKeyhole className="w-4 h-4" />
                <span>Encerrar Turno & Salvar Fechamento</span>
              </button>
            </div>
          </div>
        )}

        {/* Previous closed shifts */}
        {shiftHistory.length > 0 && (
          <div className="border-t border-neutral-800 pt-4 space-y-2">
            <h4 className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Últimos Fechamentos Salvos</span>
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {shiftHistory.slice(0, 5).map((sh) => {
                const diff =
                  (sh.countedCash || 0) - (sh.expectedCashAtClose || 0);
                return (
                  <div
                    key={sh.id}
                    className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white">
                        {formatDateTime(sh.closedAt || sh.openedAt)}
                      </span>
                      <span className="text-[11px] text-neutral-500 block">
                        Vendas: {formatCurrency(sh.totalSalesRevenue || 0)} · Contado:{' '}
                        {formatCurrency(sh.countedCash || 0)}
                      </span>
                    </div>
                    <div className="text-right font-mono">
                      <span
                        className={`font-bold ${
                          (sh.netProfitAtClose || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatCurrency(sh.netProfitAtClose || 0)}
                      </span>
                      <span className="text-[10px] text-neutral-500 block">
                        {Math.abs(diff) < 0.01
                          ? 'Gaveta exata'
                          : diff > 0
                          ? `+${formatCurrency(diff)} sobra`
                          : `${formatCurrency(diff)} falta`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
