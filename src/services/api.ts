import { 
  Product, 
  Customer, 
  Sale, 
  DebtTransaction, 
  CashFlowEntry, 
  AppSettings, 
  PaymentMethod,
  CartItem
} from '../types';
import { AppStorage } from './storage';

export class AppApi {
  // Bootstrap: loads all state from PostgreSQL database (with LocalStorage fallback)
  static async loadAllData(): Promise<{
    products: Product[];
    customers: Customer[];
    sales: Sale[];
    debtTransactions: DebtTransaction[];
    cashFlow: CashFlowEntry[];
    settings: AppSettings;
  }> {
    try {
      const res = await fetch('/api/bootstrap');
      if (res.ok) {
        const data = await res.json();
        // Also sync to local storage for offline resilience
        if (data.products?.length) AppStorage.saveProducts(data.products);
        if (data.customers?.length) AppStorage.saveCustomers(data.customers);
        if (data.sales) AppStorage.saveSales(data.sales);
        if (data.debtTransactions?.length) AppStorage.saveDebtTransactions(data.debtTransactions);
        if (data.cashFlow?.length) AppStorage.saveCashFlow(data.cashFlow);
        if (data.settings) AppStorage.saveSettings(data.settings);
        return data;
      }
    } catch (err) {
      console.warn('Backend API unavailable, falling back to LocalStorage cache:', err);
    }

    // Fallback to local storage
    return {
      products: AppStorage.getProducts(),
      customers: AppStorage.getCustomers(),
      sales: AppStorage.getSales(),
      debtTransactions: AppStorage.getDebtTransactions(),
      cashFlow: AppStorage.getCashFlow(),
      settings: AppStorage.getSettings(),
    };
  }

  static async completeSale(
    sale: Sale,
    cart: CartItem[],
    method: PaymentMethod,
    customerId?: string,
    notes?: string
  ): Promise<void> {
    try {
      await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale, cart, method, customerId, notes }),
      });
    } catch (err) {
      console.error('Failed to post sale to PostgreSQL:', err);
    }
  }

  static async saveCustomer(customerData: Partial<Customer>): Promise<Customer | null> {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });
      if (res.ok) {
        const result = await res.json();
        return result.customer;
      }
    } catch (err) {
      console.error('Failed to save customer to PostgreSQL:', err);
    }
    return null;
  }

  static async receiveDebtPayment(
    customerId: string,
    amount: number,
    method: PaymentMethod,
    notes?: string
  ): Promise<void> {
    try {
      await fetch('/api/debts/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, amount, method, notes }),
      });
    } catch (err) {
      console.error('Failed to post debt payment to PostgreSQL:', err);
    }
  }

  static async addManualDebt(
    customerId: string,
    amount: number,
    description: string
  ): Promise<void> {
    try {
      await fetch('/api/debts/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, amount, description }),
      });
    } catch (err) {
      console.error('Failed to add manual debt to PostgreSQL:', err);
    }
  }

  static async addCashFlowEntry(
    entry: Omit<CashFlowEntry, 'id' | 'timestamp'>
  ): Promise<void> {
    try {
      await fetch('/api/cash-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch (err) {
      console.error('Failed to add cash flow entry to PostgreSQL:', err);
    }
  }

  static async saveProduct(product: Product): Promise<void> {
    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
    } catch (err) {
      console.error('Failed to save product to PostgreSQL:', err);
    }
  }

  static async replenishProduct(productId: string, quantityToAdd: number): Promise<void> {
    try {
      await fetch('/api/products/replenish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantityToAdd }),
      });
    } catch (err) {
      console.error('Failed to replenish product in PostgreSQL:', err);
    }
  }

  static async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } catch (err) {
      console.error('Failed to save settings to PostgreSQL:', err);
    }
  }

  static async resetToDemo(): Promise<void> {
    try {
      await fetch('/api/reset-demo', { method: 'POST' });
    } catch (err) {
      console.error('Failed to reset demo data in PostgreSQL:', err);
    }
  }
}
