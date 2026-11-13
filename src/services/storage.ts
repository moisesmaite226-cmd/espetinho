import {
  Product,
  Customer,
  Sale,
  DebtTransaction,
  CashFlowEntry,
  AppSettings,
  PaymentMethod,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_DEBT_TRANSACTIONS,
  INITIAL_CASH_FLOW,
  INITIAL_SETTINGS,
} from '../data/initialData';

const STORAGE_KEYS = {
  PRODUCTS: 'espeto_products_v4',
  CUSTOMERS: 'espeto_customers_v4',
  SALES: 'espeto_sales_v4',
  DEBTS: 'espeto_debts_v4',
  CASH_FLOW: 'espeto_cash_flow_v4',
  SETTINGS: 'espeto_settings_v4',
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing ${key} to localStorage:`, err);
  }
}

export class AppStorage {
  static getProducts(): Product[] {
    return safeGet<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }

  static saveProducts(products: Product[]): void {
    safeSet(STORAGE_KEYS.PRODUCTS, products);
  }

  static getCustomers(): Customer[] {
    return safeGet<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }

  static saveCustomers(customers: Customer[]): void {
    safeSet(STORAGE_KEYS.CUSTOMERS, customers);
  }

  static getSales(): Sale[] {
    return safeGet<Sale[]>(STORAGE_KEYS.SALES, []);
  }

  static saveSales(sales: Sale[]): void {
    safeSet(STORAGE_KEYS.SALES, sales);
  }

  static getDebtTransactions(): DebtTransaction[] {
    return safeGet<DebtTransaction[]>(STORAGE_KEYS.DEBTS, INITIAL_DEBT_TRANSACTIONS);
  }

  static saveDebtTransactions(debts: DebtTransaction[]): void {
    safeSet(STORAGE_KEYS.DEBTS, debts);
  }

  static getCashFlow(): CashFlowEntry[] {
    return safeGet<CashFlowEntry[]>(STORAGE_KEYS.CASH_FLOW, INITIAL_CASH_FLOW);
  }

  static saveCashFlow(entries: CashFlowEntry[]): void {
    safeSet(STORAGE_KEYS.CASH_FLOW, entries);
  }

  static getSettings(): AppSettings {
    return safeGet<AppSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  static saveSettings(settings: AppSettings): void {
    safeSet(STORAGE_KEYS.SETTINGS, settings);
  }

  // Backup and restore
  static exportFullBackup(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      products: this.getProducts(),
      customers: this.getCustomers(),
      sales: this.getSales(),
      debtTransactions: this.getDebtTransactions(),
      cashFlow: this.getCashFlow(),
      settings: this.getSettings(),
    };
    return JSON.stringify(backup, null, 2);
  }

  static importFullBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.products) this.saveProducts(data.products);
      if (data.customers) this.saveCustomers(data.customers);
      if (data.sales) this.saveSales(data.sales);
      if (data.debtTransactions) this.saveDebtTransactions(data.debtTransactions);
      if (data.cashFlow) this.saveCashFlow(data.cashFlow);
      if (data.settings) this.saveSettings(data.settings);
      return true;
    } catch (err) {
      console.error('Failed to import backup:', err);
      return false;
    }
  }

  static resetToDemo(): void {
    this.saveProducts(INITIAL_PRODUCTS);
    this.saveCustomers(INITIAL_CUSTOMERS);
    this.saveDebtTransactions(INITIAL_DEBT_TRANSACTIONS);
    this.saveCashFlow(INITIAL_CASH_FLOW);
    this.saveSettings(INITIAL_SETTINGS);
    this.saveSales([]);
  }
}
