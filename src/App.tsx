/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Product, 
  Customer, 
  Sale, 
  DebtTransaction, 
  CashFlowEntry, 
  AppSettings, 
  PaymentMethod,
  CartItem
} from './types';
import { AppStorage } from './services/storage';
import { Navbar, ActiveTab } from './components/Navbar';
import { PDVView } from './components/PDVView';
import { CadernetaFiadoView } from './components/CadernetaFiadoView';
import { CashFlowView } from './components/CashFlowView';
import { StockView } from './components/StockView';
import { PromptModal } from './components/PromptModal';
import { SettingsModal } from './components/SettingsModal';
import { formatCurrency } from './utils/formatters';
import { Flame, Clock, Wallet, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pdv');
  
  // App state
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [debtTransactions, setDebtTransactions] = useState<DebtTransaction[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => AppStorage.getSettings());

  // Global modals
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Initial data load
  const reloadAllData = () => {
    setProducts(AppStorage.getProducts());
    setCustomers(AppStorage.getCustomers());
    setSales(AppStorage.getSales());
    setDebtTransactions(AppStorage.getDebtTransactions());
    setCashFlow(AppStorage.getCashFlow());
    setSettings(AppStorage.getSettings());
  };

  useEffect(() => {
    reloadAllData();

    // Clock ticker
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  // Total debt calculation
  const totalDebtPending = customers.reduce((sum, c) => sum + (c.totalDebt || 0), 0);

  // Today's cash entries
  const todayStr = new Date().toISOString().split('T')[0];
  const cashToday = cashFlow
    .filter((cf) => cf.timestamp.startsWith(todayStr))
    .reduce((sum, cf) => sum + (cf.type === 'entrada' ? cf.amount : -cf.amount), 0);

  // HANDLERS

  // 1. Complete Sale
  const handleCompleteSale = (
    sale: Sale,
    cart: CartItem[],
    method: PaymentMethod,
    customerId?: string,
    notes?: string
  ) => {
    // 1.1 Decrement stock
    const updatedProducts = products.map((prod) => {
      const totalQtyForProduct = cart
        .filter((c) => c.product.id === prod.id)
        .reduce((sum, c) => sum + c.quantity, 0);

      if (totalQtyForProduct > 0) {
        return {
          ...prod,
          stock: Math.max(0, prod.stock - totalQtyForProduct),
        };
      }
      return prod;
    });
    setProducts(updatedProducts);
    AppStorage.saveProducts(updatedProducts);

    // 1.2 Record sale
    const updatedSales = [sale, ...sales];
    setSales(updatedSales);
    AppStorage.saveSales(updatedSales);

    // 1.3 If paid upfront (Dinheiro / Pix / Cartão), add to Cash Flow
    if (method !== 'fiado') {
      const cashEntry: CashFlowEntry = {
        id: `cf_${Date.now()}`,
        timestamp: sale.timestamp,
        type: 'entrada',
        category: 'venda_vista',
        amount: sale.total,
        description: `Venda #${sale.id.slice(-4)} (${sale.items.length} itens)`,
        paymentMethod: method,
        referenceId: sale.id,
      };
      const updatedCashFlow = [cashEntry, ...cashFlow];
      setCashFlow(updatedCashFlow);
      AppStorage.saveCashFlow(updatedCashFlow);
    }

    // 1.4 If FIADO, register customer debt
    if (method === 'fiado' && customerId) {
      const targetCustomer = customers.find((c) => c.id === customerId);
      if (targetCustomer) {
        const newTotalDebt = targetCustomer.totalDebt + sale.total;
        const updatedCustomers = customers.map((c) =>
          c.id === customerId
            ? { ...c, totalDebt: newTotalDebt, lastPurchaseAt: sale.timestamp }
            : c
        );
        setCustomers(updatedCustomers);
        AppStorage.saveCustomers(updatedCustomers);

        // Record debt transaction
        const itemsSummary = sale.items
          .map((i) => `${i.quantity}x ${i.name}`)
          .join(', ');

        const debtTx: DebtTransaction = {
          id: `tx_${Date.now()}`,
          customerId: targetCustomer.id,
          customerName: targetCustomer.name,
          saleId: sale.id,
          type: 'compra',
          amount: sale.total,
          remainingDebtAfter: newTotalDebt,
          timestamp: sale.timestamp,
          paymentMethodUsed: 'fiado',
          description: `Compra no balcão: ${itemsSummary}`,
          itemsSummary,
        };
        const updatedDebtTx = [debtTx, ...debtTransactions];
        setDebtTransactions(updatedDebtTx);
        AppStorage.saveDebtTransactions(updatedDebtTx);
      }
    }
  };

  // 2. Quick add customer from PDV
  const handleQuickAddCustomer = (data: {
    name: string;
    nickname?: string;
    phone: string;
    creditLimit?: number;
  }): Customer => {
    const newCustomer: Customer = {
      id: `cust_${Date.now()}`,
      name: data.name,
      nickname: data.nickname,
      phone: data.phone,
      creditLimit: data.creditLimit || settings.defaultCreditLimit,
      totalDebt: 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [newCustomer, ...customers];
    setCustomers(updated);
    AppStorage.saveCustomers(updated);
    return newCustomer;
  };

  // 3. Save customer (create or update)
  const handleSaveCustomer = (customerData: Partial<Customer>) => {
    let updated: Customer[];
    if (customerData.id) {
      updated = customers.map((c) =>
        c.id === customerData.id ? ({ ...c, ...customerData } as Customer) : c
      );
    } else {
      const newCust: Customer = {
        id: `cust_${Date.now()}`,
        name: customerData.name || '',
        nickname: customerData.nickname,
        phone: customerData.phone || '',
        creditLimit: customerData.creditLimit || settings.defaultCreditLimit,
        totalDebt: 0,
        notes: customerData.notes,
        createdAt: new Date().toISOString(),
      };
      updated = [newCust, ...customers];
    }
    setCustomers(updated);
    AppStorage.saveCustomers(updated);
  };

  // 4. Receive debt payment (Quitar ou amortizar fiado)
  const handleReceivePayment = (
    customerId: string,
    amount: number,
    method: PaymentMethod,
    notes?: string
  ) => {
    const target = customers.find((c) => c.id === customerId);
    if (!target) return;

    const newRemainingDebt = Math.max(0, target.totalDebt - amount);
    const now = new Date().toISOString();

    // 4.1 Update customer balance
    const updatedCustomers = customers.map((c) =>
      c.id === customerId ? { ...c, totalDebt: newRemainingDebt } : c
    );
    setCustomers(updatedCustomers);
    AppStorage.saveCustomers(updatedCustomers);

    // 4.2 Record debt transaction
    const debtTx: DebtTransaction = {
      id: `tx_${Date.now()}`,
      customerId: target.id,
      customerName: target.name,
      type: 'pagamento',
      amount,
      remainingDebtAfter: newRemainingDebt,
      timestamp: now,
      paymentMethodUsed: method,
      description: `Pagamento recebido via ${method.toUpperCase()}${notes ? ` (${notes})` : ''}`,
    };
    const updatedDebtTx = [debtTx, ...debtTransactions];
    setDebtTransactions(updatedDebtTx);
    AppStorage.saveDebtTransactions(updatedDebtTx);

    // 4.3 Add to Cash Flow as 'recebimento_fiado'
    const cashEntry: CashFlowEntry = {
      id: `cf_${Date.now()}`,
      timestamp: now,
      type: 'entrada',
      category: 'recebimento_fiado',
      amount,
      description: `Recebimento de Fiado (${target.nickname || target.name})`,
      paymentMethod: method,
      referenceId: debtTx.id,
    };
    const updatedCashFlow = [cashEntry, ...cashFlow];
    setCashFlow(updatedCashFlow);
    AppStorage.saveCashFlow(updatedCashFlow);
  };

  // 5. Add manual debt to customer
  const handleAddManualDebt = (
    customerId: string,
    amount: number,
    description: string
  ) => {
    const target = customers.find((c) => c.id === customerId);
    if (!target) return;

    const newRemainingDebt = target.totalDebt + amount;
    const now = new Date().toISOString();

    const updatedCustomers = customers.map((c) =>
      c.id === customerId ? { ...c, totalDebt: newRemainingDebt, lastPurchaseAt: now } : c
    );
    setCustomers(updatedCustomers);
    AppStorage.saveCustomers(updatedCustomers);

    const debtTx: DebtTransaction = {
      id: `tx_${Date.now()}`,
      customerId: target.id,
      customerName: target.name,
      type: 'compra',
      amount,
      remainingDebtAfter: newRemainingDebt,
      timestamp: now,
      paymentMethodUsed: 'fiado',
      description,
    };
    const updatedDebtTx = [debtTx, ...debtTransactions];
    setDebtTransactions(updatedDebtTx);
    AppStorage.saveDebtTransactions(updatedDebtTx);
  };

  // 6. Add cash flow entry
  const handleAddCashFlowEntry = (entry: Omit<CashFlowEntry, 'id' | 'timestamp'>) => {
    const newEntry: CashFlowEntry = {
      id: `cf_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    const updated = [newEntry, ...cashFlow];
    setCashFlow(updated);
    AppStorage.saveCashFlow(updated);
  };

  // 7. Save product
  const handleSaveProduct = (prod: Product) => {
    const exists = products.some((p) => p.id === prod.id);
    let updated: Product[];
    if (exists) {
      updated = products.map((p) => (p.id === prod.id ? prod : p));
    } else {
      updated = [prod, ...products];
    }
    setProducts(updated);
    AppStorage.saveProducts(updated);
  };

  // 8. Quick Replenish
  const handleQuickReplenish = (productId: string, quantityToAdd: number) => {
    const updated = products.map((p) =>
      p.id === productId ? { ...p, stock: p.stock + quantityToAdd } : p
    );
    setProducts(updated);
    AppStorage.saveProducts(updated);
  };

  // 9. Save Settings
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    AppStorage.saveSettings(newSettings);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalDebtPending={totalDebtPending}
        openSettings={() => setIsSettingsOpen(true)}
        openPrompt={() => setIsPromptOpen(true)}
        storeName={settings.storeName}
      />

      {/* Subheader Status Strip */}
      <div className="bg-neutral-900/60 border-b border-neutral-800/80 px-4 py-2 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-neutral-400">
          
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-neutral-300">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>Churrasqueira & Bar Ativo</span>
            </span>

            <span className="hidden sm:inline">·</span>

            <span className="hidden sm:flex items-center gap-1">
              <span>Caixa Hoje:</span>
              <strong className="text-amber-400 font-mono font-bold tabular-nums">
                {formatCurrency(cashToday)}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {totalDebtPending > 0 && (
              <button
                onClick={() => setActiveTab('fiado')}
                className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Na Praça (Fiado):</span>
                <strong className="font-mono font-bold tabular-nums">
                  {formatCurrency(totalDebtPending)}
                </strong>
              </button>
            )}

            <div className="flex items-center gap-1 font-mono text-neutral-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{currentTime || '18:00'}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {activeTab === 'pdv' && (
          <PDVView
            products={products}
            customers={customers}
            settings={settings}
            onCompleteSale={handleCompleteSale}
            onQuickAddCustomer={handleQuickAddCustomer}
          />
        )}

        {activeTab === 'fiado' && (
          <CadernetaFiadoView
            customers={customers}
            debtTransactions={debtTransactions}
            settings={settings}
            onSaveCustomer={handleSaveCustomer}
            onReceivePayment={handleReceivePayment}
            onAddManualDebt={handleAddManualDebt}
          />
        )}

        {activeTab === 'caixa' && (
          <CashFlowView
            entries={cashFlow}
            settings={settings}
            onAddEntry={handleAddCashFlowEntry}
          />
        )}

        {activeTab === 'estoque' && (
          <StockView
            products={products}
            onSaveProduct={handleSaveProduct}
            onQuickReplenish={handleQuickReplenish}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-900/50 py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-400">{settings.storeName}</span>
            <span>·</span>
            <span>Sistema PDV & Fiado Inteligente</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPromptOpen(true)}
              className="text-amber-400 hover:text-amber-300 transition-colors font-medium"
            >
              📋 Ver Prompt Estruturado
            </button>
            <span>·</span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-neutral-300 transition-colors"
            >
              ⚙️ Configurar Pix & Backup
            </button>
          </div>
        </div>
      </footer>

      {/* Prompt Modal */}
      {isPromptOpen && (
        <PromptModal onClose={() => setIsPromptOpen(false)} />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onReloadAllData={reloadAllData}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

    </div>
  );
}
