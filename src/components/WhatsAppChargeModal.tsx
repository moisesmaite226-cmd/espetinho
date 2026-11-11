import React, { useState, useEffect } from 'react';
import { Customer, DebtTransaction, AppSettings } from '../types';
import { 
  formatCurrency, 
  sanitizePhoneForWhatsApp, 
  formatDisplayPhone, 
  buildWhatsAppDebtMessage, 
  DebtMessageTone 
} from '../utils/formatters';
import { MessageSquare, Send, Copy, Check, Sparkles, AlertCircle, X } from 'lucide-react';

interface WhatsAppChargeModalProps {
  customer: Customer;
  transactions: DebtTransaction[];
  settings: AppSettings;
  onClose: () => void;
}

export const WhatsAppChargeModal: React.FC<WhatsAppChargeModalProps> = ({
  customer,
  transactions,
  settings,
  onClose,
}) => {
  const [tone, setTone] = useState<DebtMessageTone>('amigavel');
  const [customNote, setCustomNote] = useState('');
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);

  // Filter transactions for this customer
  const customerHistory = transactions.filter((t) => t.customerId === customer.id);

  // Update message when tone or customNote changes
  useEffect(() => {
    const generated = buildWhatsAppDebtMessage(
      customer,
      settings,
      customerHistory,
      tone,
      customNote.trim() || undefined
    );
    setMessageText(generated);
  }, [customer, settings, customerHistory, tone, customNote]);

  const cleanPhone = sanitizePhoneForWhatsApp(customer.phone);
  const isValidPhone = cleanPhone.length >= 10;
  const waUrl = isValidPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
    : '#';

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl p-5 sm:p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[95vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cobrança no WhatsApp</h3>
              <p className="text-xs text-neutral-400">
                Cliente: <strong className="text-neutral-200">{customer.name}</strong> {customer.nickname && `(${customer.nickname})`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer & Debt Overview Card */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold block">
              Telefone / WhatsApp
            </span>
            <span className="text-sm font-mono text-white">
              {formatDisplayPhone(customer.phone)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold block">
              Valor a Cobrar
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-rose-400 tabular-nums">
              {formatCurrency(customer.totalDebt)}
            </span>
          </div>
        </div>

        {/* Tone Selector */}
        <div>
          <label className="text-xs font-semibold text-neutral-300 block mb-2">
            Escolha o modelo da mensagem:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setTone('amigavel')}
              className={`p-2.5 rounded-xl border text-xs font-medium transition-colors text-center ${
                tone === 'amigavel'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              🍻 Amigável
            </button>

            <button
              type="button"
              onClick={() => setTone('direto')}
              className={`p-2.5 rounded-xl border text-xs font-medium transition-colors text-center ${
                tone === 'direto'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              ⚡ Fechamento Direto
            </button>

            <button
              type="button"
              onClick={() => setTone('detalhado')}
              className={`p-2.5 rounded-xl border text-xs font-medium transition-colors text-center ${
                tone === 'detalhado'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              🧾 Extrato Detalhado
            </button>
          </div>
        </div>

        {/* Custom note option */}
        <div>
          <label className="text-xs text-neutral-400 block mb-1">
            Recado adicional (opcional):
          </label>
          <input
            type="text"
            placeholder="Ex: Hoje tem cerveja trincando e alcatra na brasa se quiser passar!"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Message Live Preview */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <span>Prévia do texto do WhatsApp</span>
              <span className="text-[11px] text-neutral-500 font-normal">(pode editar direto abaixo)</span>
            </label>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>
          </div>

          <textarea
            rows={7}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full p-3 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 font-sans focus:outline-none focus:border-amber-500 leading-relaxed"
          />
        </div>

        {/* Warning if Pix is not configured */}
        {!settings.ownerPixKey && (
          <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Você ainda não configurou sua chave Pix nas Configurações. Ela não sairá completa na mensagem.
            </span>
          </div>
        )}

        {/* Primary Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-neutral-500 text-center sm:text-left">
            Ao clicar, abre o WhatsApp com a mensagem pronta.
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setTimeout(onClose, 500);
              }}
              className="flex-1 sm:flex-none px-5 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Abrir WhatsApp e Enviar</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
