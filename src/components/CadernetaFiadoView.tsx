import React, { useState } from 'react';
import { Customer, DebtTransaction, AppSettings, PaymentMethod } from '../types';
import { 
  formatCurrency, 
  formatDisplayPhone, 
  formatDateTime, 
  sanitizePhoneForWhatsApp 
} from '../utils/formatters';
import { 
  UserPlus, 
  Search, 
  MessageSquare, 
  DollarSign, 
  History, 
  Edit2, 
  AlertTriangle,
  Users,
  Wallet,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { WhatsAppChargeModal } from './WhatsAppChargeModal';
import { ReceivePaymentModal } from './ReceivePaymentModal';
import { CustomerModal } from './CustomerModal';
import { CustomerStatementModal } from './CustomerStatementModal';

interface CadernetaFiadoViewProps {
  customers: Customer[];
  debtTransactions: DebtTransaction[];
  settings: AppSettings;
  onSaveCustomer: (customerData: Partial<Customer>) => void;
  onReceivePayment: (customerId: string, amount: number, method: PaymentMethod, notes?: string) => void;
  onAddManualDebt: (customerId: string, amount: number, description: string) => void;
}

export const CadernetaFiadoView: React.FC<CadernetaFiadoViewProps> = ({
  customers,
  debtTransactions,
  settings,
  onSaveCustomer,
  onReceivePayment,
  onAddManualDebt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'com_divida' | 'em_dia'>('com_divida');

  // Modals state
  const [chargeCustomer, setChargeCustomer] = useState<Customer | null>(null);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);

  // Statistics
  const totalDebtAll = customers.reduce((sum, c) => sum + (c.totalDebt || 0), 0);
  const debtorsCount = customers.filter((c) => c.totalDebt > 0).length;
  const highestDebtor = [...customers].sort((a, b) => b.totalDebt - a.totalDebt)[0];

  // Filtering
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.nickname && customer.nickname.toLowerCase().includes(searchQuery.toLowerCase())) ||
      customer.phone.includes(searchQuery);

    if (!matchesSearch) return false;

    if (statusFilter === 'com_divida') return customer.totalDebt > 0;
    if (statusFilter === 'em_dia') return customer.totalDebt === 0;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total a Receber */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-neutral-400 font-medium">Total na Rua (A Receber)</span>
            <p className="text-2xl font-bold font-mono text-rose-400 tabular-nums mt-1">
              {formatCurrency(totalDebtAll)}
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Distribuído em {debtorsCount} {debtorsCount === 1 ? 'cliente' : 'clientes'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Clientes em Aberto */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-neutral-400 font-medium">Caderneta de Clientes</span>
            <p className="text-2xl font-bold font-mono text-white tabular-nums mt-1">
              {customers.length} <span className="text-xs font-normal text-neutral-400">cadastrados</span>
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {debtorsCount} devendo · {customers.length - debtorsCount} zerados
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Maior Dívida */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-neutral-400 font-medium">Maior Saldo em Aberto</span>
            <p className="text-xl font-bold font-mono text-amber-400 tabular-nums mt-1 truncate max-w-[190px]">
              {highestDebtor && highestDebtor.totalDebt > 0 
                ? formatCurrency(highestDebtor.totalDebt) 
                : 'R$ 0,00'}
            </p>
            <p className="text-[11px] text-neutral-400 truncate max-w-[190px] mt-0.5">
              {highestDebtor && highestDebtor.totalDebt > 0 
                ? (highestDebtor.nickname || highestDebtor.name) 
                : 'Ninguém devendo'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Control Bar: Search, Filters and New Customer */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, apelido ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5">
          <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            <button
              onClick={() => setStatusFilter('com_divida')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === 'com_divida'
                  ? 'bg-neutral-800 text-rose-300 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Com Dívida ({debtorsCount})
            </button>
            <button
              onClick={() => setStatusFilter('em_dia')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === 'em_dia'
                  ? 'bg-neutral-800 text-emerald-300 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Em Dia ({customers.length - debtorsCount})
            </button>
            <button
              onClick={() => setStatusFilter('todos')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === 'todos'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todos ({customers.length})
            </button>
          </div>

          <button
            onClick={() => setIsNewCustomerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg transition-colors whitespace-nowrap shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Novo Cliente</span>
          </button>
        </div>

      </div>

      {/* Customer List / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => {
          const hasDebt = customer.totalDebt > 0;
          const cleanPhone = sanitizePhoneForWhatsApp(customer.phone);

          return (
            <div
              key={customer.id}
              className={`bg-neutral-900 border rounded-xl p-4 flex flex-col justify-between transition-all ${
                hasDebt
                  ? 'border-neutral-800 hover:border-rose-900/60 shadow-sm'
                  : 'border-neutral-800/60 opacity-80 hover:opacity-100'
              }`}
            >
              {/* Top part: Name, Nickname & Debt */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                      <span>{customer.name}</span>
                    </h3>
                    {customer.nickname && (
                      <p className="text-xs text-amber-400/90 font-medium truncate">
                        "{customer.nickname}"
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-neutral-500 uppercase font-semibold block">
                      Saldo Devedor
                    </span>
                    <span className={`text-lg font-bold font-mono tabular-nums ${
                      hasDebt ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {formatCurrency(customer.totalDebt)}
                    </span>
                  </div>
                </div>

                {/* WhatsApp & Details line */}
                <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                  <div className="flex items-center gap-1.5 font-mono">
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-300 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                      title="Abrir WhatsApp"
                    >
                      <span>{formatDisplayPhone(customer.phone)}</span>
                      <ExternalLink className="w-3 h-3 text-neutral-500" />
                    </a>
                  </div>

                  {customer.creditLimit ? (
                    <span className="text-[11px] text-neutral-500">
                      Lim: {formatCurrency(customer.creditLimit)}
                    </span>
                  ) : null}
                </div>

                {customer.notes && (
                  <p className="mt-2 text-[11px] text-neutral-400 bg-neutral-950 p-2 rounded-lg border border-neutral-800/60 italic line-clamp-2">
                    "{customer.notes}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center gap-2">
                
                {/* Cobrar no WhatsApp Button */}
                <button
                  type="button"
                  disabled={!hasDebt}
                  onClick={() => setChargeCustomer(customer)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    hasDebt
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20 active:scale-[0.98]'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  }`}
                  title="Abrir modelo de mensagem pronto para WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Cobrar no WhatsApp</span>
                </button>

                {/* Receber Pagamento Button */}
                <button
                  type="button"
                  disabled={!hasDebt}
                  onClick={() => setPaymentCustomer(customer)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                    hasDebt
                      ? 'bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-neutral-200'
                      : 'bg-neutral-800/50 text-neutral-600 cursor-not-allowed'
                  }`}
                  title="Dar baixa no fiado"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Receber</span>
                </button>

                {/* Extrato Button */}
                <button
                  type="button"
                  onClick={() => setStatementCustomer(customer)}
                  className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
                  title="Ver extrato completo de compras e pagamentos"
                >
                  <History className="w-3.5 h-3.5" />
                </button>

                {/* Editar Button */}
                <button
                  type="button"
                  onClick={() => setEditCustomer(customer)}
                  className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
                  title="Editar cliente"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

              </div>
            </div>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="p-12 text-center bg-neutral-900 border border-neutral-800 rounded-xl">
          <Users className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
          <p className="text-sm text-neutral-400">Nenhum cliente encontrado com este filtro.</p>
        </div>
      )}

      {/* WhatsApp Modal */}
      {chargeCustomer && (
        <WhatsAppChargeModal
          customer={chargeCustomer}
          transactions={debtTransactions}
          settings={settings}
          onClose={() => setChargeCustomer(null)}
        />
      )}

      {/* Payment Modal */}
      {paymentCustomer && (
        <ReceivePaymentModal
          customer={paymentCustomer}
          onReceivePayment={onReceivePayment}
          onClose={() => setPaymentCustomer(null)}
        />
      )}

      {/* Statement Modal */}
      {statementCustomer && (
        <CustomerStatementModal
          customer={statementCustomer}
          transactions={debtTransactions}
          onAddManualDebt={onAddManualDebt}
          onOpenReceivePayment={(cust) => {
            setStatementCustomer(null);
            setPaymentCustomer(cust);
          }}
          onOpenWhatsAppCharge={(cust) => {
            setStatementCustomer(null);
            setChargeCustomer(cust);
          }}
          onClose={() => setStatementCustomer(null)}
        />
      )}

      {/* Customer Create/Edit Modal */}
      {(isNewCustomerOpen || editCustomer) && (
        <CustomerModal
          customer={editCustomer}
          defaultLimit={settings.defaultCreditLimit}
          onSaveCustomer={(data) => {
            if (editCustomer) {
              onSaveCustomer({ ...editCustomer, ...data });
            } else {
              onSaveCustomer(data);
            }
            setIsNewCustomerOpen(false);
            setEditCustomer(null);
          }}
          onClose={() => {
            setIsNewCustomerOpen(false);
            setEditCustomer(null);
          }}
        />
      )}

    </div>
  );
};
