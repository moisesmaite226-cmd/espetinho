import React, { useState } from 'react';
import { CashFlowEntry, CashFlowCategory, PaymentMethod, AppSettings } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Minus, 
  Share2, 
  Calendar, 
  Receipt,
  Flame,
  Check,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  X
} from 'lucide-react';

interface CashFlowViewProps {
  entries: CashFlowEntry[];
  settings: AppSettings;
  onAddEntry: (entry: Omit<CashFlowEntry, 'id' | 'timestamp'>) => void;
}

export const CashFlowView: React.FC<CashFlowViewProps> = ({
  entries,
  settings,
  onAddEntry,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'saida' | 'entrada'>('saida');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CashFlowCategory>('compra_carvao_gelo');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Filter by today or all
  const [filterPeriod, setFilterPeriod] = useState<'hoje' | 'todos'>('hoje');

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredEntries = entries.filter((e) => {
    if (filterPeriod === 'hoje') {
      return e.timestamp.startsWith(todayStr);
    }
    return true;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Calculations
  const totalEntradas = filteredEntries
    .filter((e) => e.type === 'entrada')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalSaidas = filteredEntries
    .filter((e) => e.type === 'saida')
    .reduce((sum, e) => sum + e.amount, 0);

  const saldoLiquido = totalEntradas - totalSaidas;

  const vendasVista = filteredEntries
    .filter((e) => e.type === 'entrada' && e.category === 'venda_vista')
    .reduce((sum, e) => sum + e.amount, 0);

  const recebimentosFiado = filteredEntries
    .filter((e) => e.type === 'entrada' && e.category === 'recebimento_fiado')
    .reduce((sum, e) => sum + e.amount, 0);

  const handleOpenAddModal = (type: 'entrada' | 'saida') => {
    setModalType(type);
    setCategory(type === 'saida' ? 'compra_carvao_gelo' : 'suprimento_troco');
    setAmount('');
    setDescription('');
    setIsAddModalOpen(true);
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount.replace(',', '.')) || 0;
    if (val <= 0 || !description.trim()) {
      alert('Informe um valor e uma descrição válida!');
      return;
    }

    onAddEntry({
      type: modalType,
      category,
      amount: val,
      description: description.trim(),
      paymentMethod,
    });

    setIsAddModalOpen(false);
    setAmount('');
    setDescription('');
  };

  const handleCopyDailySummary = () => {
    const summaryText = `📊 *FECHAMENTO DE CAIXA - ${settings.storeName}*
📅 Data: ${new Date().toLocaleDateString('pt-BR')}

🟢 *TOTAL DE ENTRADAS:* ${formatCurrency(totalEntradas)}
   • Vendas Balcão: ${formatCurrency(vendasVista)}
   • Recebimento de Fiado: ${formatCurrency(recebimentosFiado)}

🔴 *TOTAL DE SAÍDAS/DESPESAS:* ${formatCurrency(totalSaidas)}

💵 *SALDO LÍQUIDO EM CAIXA:* ${formatCurrency(saldoLiquido)}
-----------------------------------
Gerado pelo Espeto & Gelada Gestor 🔥`;

    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const categoryLabels: Record<CashFlowCategory, string> = {
    venda_vista: 'Venda à Vista',
    recebimento_fiado: 'Recebimento de Fiado',
    suprimento_troco: 'Fundo de Troco / Aporte',
    compra_carvao_gelo: 'Carvão & Gelo',
    compra_carne: 'Carnes & Insumos',
    compra_bebidas: 'Reposição Bebidas',
    embalagens_descartaveis: 'Embalagens / Descartáveis',
    retirada_proprietario: 'Retirada Pró-Labore',
    outros: 'Outros Gastos',
  };

  return (
    <div className="space-y-6">
      
      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Entradas */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Entradas ({filterPeriod === 'hoje' ? 'Hoje' : 'Total'})</span>
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
            <span className="text-xs text-neutral-400 font-medium">Saídas / Despesas</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-rose-400 tabular-nums mt-2">
            {formatCurrency(totalSaidas)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">
            Carvão, gelo, reposições e compras operacionais
          </p>
        </div>

        {/* Saldo Líquido */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Saldo Líquido em Caixa</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <CircleDollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-bold font-mono tabular-nums mt-2 ${
            saldoLiquido >= 0 ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {formatCurrency(saldoLiquido)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">
            Diferença real entre recebidos e gastos
          </p>
        </div>

      </div>

      {/* Control Strip */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        
        {/* Period Selector */}
        <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800 self-start sm:self-auto">
          <button
            onClick={() => setFilterPeriod('hoje')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              filterPeriod === 'hoje'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Caixa de Hoje
          </button>
          <button
            onClick={() => setFilterPeriod('todos')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              filterPeriod === 'todos'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Todas as Movimentações
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
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
            <span>- Lançar Despesa</span>
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

              return (
                <div
                  key={entry.id}
                  className="px-4 py-3 flex items-center justify-between hover:bg-neutral-800/40 transition-colors text-xs"
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

                  <div className="text-right shrink-0 pl-3">
                    <span className={`text-sm font-mono font-bold tabular-nums ${
                      isIncome ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isIncome ? `+ ${formatCurrency(entry.amount)}` : `- ${formatCurrency(entry.amount)}`}
                    </span>
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
                  onChange={(e) => setCategory(e.target.value as CashFlowCategory)}
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white"
                >
                  {modalType === 'saida' ? (
                    <>
                      <option value="compra_carvao_gelo">Carvão e Gelo</option>
                      <option value="compra_carne">Carnes e Alimentos</option>
                      <option value="compra_bebidas">Reposição de Bebidas</option>
                      <option value="embalagens_descartaveis">Embalagens e Descartáveis</option>
                      <option value="retirada_proprietario">Retirada Pessoal / Pró-Labore</option>
                      <option value="outros">Outros Gastos Operacionais</option>
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

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Descrição do Lançamento *
                </label>
                <input
                  type="text"
                  required
                  placeholder={modalType === 'saida' ? 'Ex: 3 sacos de carvão vegetal + gelo' : 'Ex: Fundo de troco para início do dia'}
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
