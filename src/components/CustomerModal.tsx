import React, { useState } from 'react';
import { Customer } from '../types';
import { UserPlus, UserCheck, X } from 'lucide-react';

interface CustomerModalProps {
  customer?: Customer | null;
  onSaveCustomer: (customerData: Partial<Customer>) => void;
  onClose: () => void;
  defaultLimit?: number;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  customer,
  onSaveCustomer,
  onClose,
  defaultLimit = 100,
}) => {
  const isEditing = Boolean(customer);

  const [name, setName] = useState(customer?.name || '');
  const [nickname, setNickname] = useState(customer?.nickname || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [creditLimit, setCreditLimit] = useState(
    customer?.creditLimit !== undefined ? customer.creditLimit.toString() : defaultLimit.toString()
  );
  const [notes, setNotes] = useState(customer?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Preencha Nome e Telefone / WhatsApp!');
      return;
    }

    onSaveCustomer({
      name: name.trim(),
      nickname: nickname.trim() || undefined,
      phone: phone.trim(),
      creditLimit: parseFloat(creditLimit) || defaultLimit,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              {isEditing ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <h3 className="text-base font-bold text-white">
              {isEditing ? 'Editar Cliente da Caderneta' : 'Cadastrar Novo Cliente'}
            </h3>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: João da Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1">
              Apelido ou Como é Conhecido (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Marcão da Oficina, Pedrinho da Van"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1">
              WhatsApp (DDD + Número) *
            </label>
            <input
              type="tel"
              required
              placeholder="Ex: 11987654321"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500"
            />
            <p className="text-[10px] text-neutral-500 mt-1">
              Fundamental para o envio de cobrança com 1 clique no WhatsApp.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1">
              Limite de Crédito Sugerido (R$)
            </label>
            <input
              type="number"
              step="10"
              placeholder="100"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500"
            />
            <p className="text-[10px] text-neutral-500 mt-1">
              O sistema avisará no balcão caso a dívida do cliente ultrapasse este valor.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1">
              Observações / Referência
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Paga todo quinto dia útil; Mora na rua de trás..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
            />
          </div>

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
              className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl shadow-md"
            >
              {isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
