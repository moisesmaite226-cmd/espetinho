import React, { useState } from 'react';
import { Customer, DebtTransaction } from '../types';
import { formatCurrency, formatDateTime, formatDisplayPhone } from '../utils/formatters';
import { History, ArrowDownLeft, ArrowUpRight, Plus, X } from 'lucide-react';

interface CustomerStatementModalProps {
  customer: Customer;
  transactions: DebtTransaction[];
  onAddManualDebt: (customerId: string, amount: number, description: string) => void;
  onOpenReceivePayment: (customer: Customer) => void;
  onOpenWhatsAppCharge: (customer: Customer) => void;
  onClose: () => void;
}

export const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  customer,
  transactions,
  onAddManualDebt,
  onOpenReceivePayment,
  onOpenWhatsAppCharge,
  onClose,
}) => {
  const [isAddingDebt, setIsAddingDebt] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const [manualDescription, setManualDescription] = useState('');

  const customerTransactions = transactions
    .filter((t) => t.customerId === customer.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(manualAmount.replace(',', '.')) || 0;
    if (val <= 0 || !manualDescription.trim()) {
      alert('Informe o valor e uma descrição!');
      return;
    }
    onAddManualDebt(customer.id, val, manualDescription.trim());
    setManualAmount('');
    setManualDescription('');
    setIsAddingDebt(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 text-amber-400 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Extrato da Caderneta: {customer.name}
              </h3>
              <p className="text-xs text-neutral-400">
                {customer.nickname ? `Apelido: ${customer.nickname} · ` : ''}
                WhatsApp: {formatDisplayPhone(customer.phone)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Debt Card & Quick Actions */}
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-neutral-500 uppercase font-semibold block">
              Saldo Devedor Atual
            </span>
            <span className="text-2xl font-bold font-mono text-rose-400 tabular-nums">
              {formatCurrency(customer.totalDebt)}
            </span>
            {customer.creditLimit ? (
              <p className="text-[11px] text-neutral-500">
                Limite cadastrado: {formatCurrency(customer.creditLimit)}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenWhatsAppCharge(customer)}
              className="flex-1 sm:flex-none px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
            >
              📲 Cobrar WhatsApp
            </button>
            <button
              onClick={() => onOpenReceivePayment(customer)}
              className="flex-1 sm:flex-none px-3 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-lg transition-colors"
            >
              💰 Baixar Pagamento
            </button>
          </div>
        </div>

        {/* Manual Debt Form Toggle */}
        <div>
          {!isAddingDebt ? (
            <button
              type="button"
              onClick={() => setIsAddingDebt(true)}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Lançar compra avulsa no fiado (fora do cardápio)
            </button>
          ) : (
            <form onSubmit={handleAddManual} className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-2 text-xs">
              <span className="font-semibold text-neutral-300 block">Lançamento Avulso de Fiado:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.50"
                  required
                  placeholder="Valor (R$)"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white font-mono"
                />
                <input
                  type="text"
                  required
                  placeholder="Descrição (ex: 2 cervejas + cigarro)"
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingDebt(false)}
                  className="px-2.5 py-1 text-neutral-400 bg-neutral-800 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-amber-500 text-neutral-950 font-bold rounded"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Transactions Timeline */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <span className="text-xs font-semibold text-neutral-400 block mb-1">
            Histórico de Movimentações:
          </span>

          {customerTransactions.length === 0 ? (
            <div className="py-8 text-center text-neutral-500 text-xs">
              Nenhuma movimentação registrada para este cliente.
            </div>
          ) : (
            customerTransactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    tx.type === 'compra' 
                      ? 'bg-rose-500/10 text-rose-400' 
                      : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {tx.type === 'compra' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownLeft className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-neutral-200 font-medium">{tx.description}</p>
                    {tx.itemsSummary && (
                      <p className="text-[11px] text-neutral-500 line-clamp-1">{tx.itemsSummary}</p>
                    )}
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {formatDateTime(tx.timestamp)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`font-mono font-bold block tabular-nums ${
                    tx.type === 'compra' ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {tx.type === 'compra' ? `+ ${formatCurrency(tx.amount)}` : `- ${formatCurrency(tx.amount)}`}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    Restante: {formatCurrency(tx.remainingDebtAfter)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-800 pt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
