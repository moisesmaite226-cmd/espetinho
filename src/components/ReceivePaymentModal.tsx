import React, { useState } from 'react';
import { Customer, PaymentMethod } from '../types';
import { formatCurrency, formatDisplayPhone } from '../utils/formatters';
import { CheckCircle2, DollarSign, X } from 'lucide-react';

interface ReceivePaymentModalProps {
  customer: Customer;
  onReceivePayment: (
    customerId: string, 
    amount: number, 
    method: PaymentMethod, 
    notes?: string
  ) => void;
  onClose: () => void;
}

export const ReceivePaymentModal: React.FC<ReceivePaymentModalProps> = ({
  customer,
  onReceivePayment,
  onClose,
}) => {
  const [amount, setAmount] = useState<string>(customer.totalDebt.toString());
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [notes, setNotes] = useState('');

  const parseAmountInput = (raw: string): number => {
    const cleaned = raw.replace(/[^\d.,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const numAmount = parseAmountInput(amount);
  const remainingDebt = Math.max(0, customer.totalDebt - numAmount);

  const hasCashTendered = cashTendered.trim().length > 0;
  const numCashTendered = hasCashTendered ? parseAmountInput(cashTendered) : numAmount;
  const missingCash = method === 'dinheiro' && hasCashTendered && numCashTendered < numAmount ? numAmount - numCashTendered : 0;
  const changeDue = method === 'dinheiro' && hasCashTendered && numCashTendered > numAmount ? numCashTendered - numAmount : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      return;
    }
    if (missingCash > 0) {
      return;
    }
    if (numAmount > customer.totalDebt) {
      if (!confirm(`O valor pago (${formatCurrency(numAmount)}) é maior que a dívida (${formatCurrency(customer.totalDebt)}). Deseja continuar?`)) {
        return;
      }
    }

    onReceivePayment(customer.id, numAmount, method, notes.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-5 space-y-5 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Receber Pagamento</h3>
              <p className="text-xs text-neutral-400">
                Baixar dívida de {customer.name} {customer.nickname && `(${customer.nickname})`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Balance Info */}
        <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 flex justify-between items-center text-xs">
          <div>
            <span className="text-neutral-400 block">Dívida Total Atual:</span>
            <span className="text-base font-bold font-mono text-rose-400 tabular-nums">
              {formatCurrency(customer.totalDebt)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAmount(customer.totalDebt.toString())}
            className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-amber-300 rounded text-xs font-semibold"
          >
            Quitar Tudo
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Amount input */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1">
              Valor que o cliente está pagando:
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-sm">
                R$
              </span>
              <input
                type="number"
                step="0.50"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-base font-mono bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1">
              Forma de Recebimento:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('pix')}
                className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                  method === 'pix'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                📱 Pix
              </button>
              <button
                type="button"
                onClick={() => setMethod('dinheiro')}
                className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                  method === 'dinheiro'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                💵 Dinheiro
              </button>
              <button
                type="button"
                onClick={() => setMethod('cartao_debito')}
                className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                  method === 'cartao_debito'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                💳 Cartão
              </button>
            </div>
          </div>

          {/* Cash Change Calculator when Dinheiro */}
          {method === 'dinheiro' && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300">
                  Quanto o cliente entregou em dinheiro?
                </label>
                {hasCashTendered && (
                  <button
                    type="button"
                    onClick={() => setCashTendered('')}
                    className="text-[11px] text-neutral-400 hover:text-white underline"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs font-bold">
                  R$
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={`Ex: 100,00 (ou deixe vazio se exato)`}
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full pl-9 pr-3 py-2 text-sm font-mono font-bold bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[20, 50, 100, 200].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCashTendered(val.toString())}
                    className="px-2 py-1 text-[11px] font-mono font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded border border-neutral-700"
                  >
                    R$ {val}
                  </button>
                ))}
              </div>

              {missingCash > 0 ? (
                <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs">
                  <span className="text-rose-300 font-semibold">Valor entregue menor que a baixa:</span>
                  <span className="font-mono font-bold text-rose-400 tabular-nums">
                    Falta {formatCurrency(missingCash)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs">
                  <span className="text-neutral-300 font-semibold">Troco a devolver:</span>
                  <span className={`text-base font-mono font-bold tabular-nums ${
                    changeDue > 0 ? 'text-emerald-400' : 'text-neutral-400'
                  }`}>
                    {formatCurrency(changeDue)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* New balance preview */}
          <div className="p-3 bg-neutral-950/70 rounded-xl border border-neutral-800 text-xs flex justify-between items-center">
            <span className="text-neutral-400">Saldo Restante na Caderneta:</span>
            <span className="font-mono font-bold text-white tabular-nums">
              {formatCurrency(remainingDebt)}
            </span>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-neutral-400 block mb-1">
              Observação (opcional):
            </label>
            <input
              type="text"
              placeholder="Ex: Pagou metade no Pix, prometeu o restante sexta"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={missingCash > 0 || numAmount <= 0}
              className={`px-5 py-2 text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 ${
                missingCash > 0 || numAmount <= 0
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Recebimento</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
