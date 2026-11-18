import {
  Product,
  Customer,
  Sale,
  DebtTransaction,
  CashFlowEntry,
  AppSettings,
  OpenOrderTab,
  ComboOffer,
  DailyGoalSettings,
  RegisterShift,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_DEBT_TRANSACTIONS,
  INITIAL_CASH_FLOW,
  INITIAL_SETTINGS,
  INITIAL_COMBOS,
} from '../data/initialData';

const STORAGE_KEYS = {
  PRODUCTS: 'espeto_products_v4',
  CUSTOMERS: 'espeto_customers_v4',
  SALES: 'espeto_sales_v4',
  DEBTS: 'espeto_debts_v4',
  CASH_FLOW: 'espeto_cash_flow_v4',
  SETTINGS: 'espeto_settings_v4',
  OPEN_TABS: 'espeto_open_tabs_v1',
  REMOVED_PRODUCT_IDS: 'espeto_removed_product_ids_v1',
  COMBOS: 'espeto_combos_v1',
  DAILY_GOALS: 'espeto_daily_goals_v1',
  CURRENT_SHIFT: 'espeto_current_shift_v1',
  SHIFT_HISTORY: 'espeto_shift_history_v1',
};

const DEFAULT_DAILY_GOALS: DailyGoalSettings = {
  dailyFixedCost: 80,
  dailyProfitTarget: 250,
};

export function normalizeImageUrl(url?: string): string | undefined {
  if (!url) return url;
  return url.replace('/src/assets/images/', '/images/');
}

function normalizeProducts(products: Product[]): Product[] {
  const initialById = new Map(INITIAL_PRODUCTS.map((item) => [item.id, item]));
  const normalized = products.map((p) => {
    const cleanUrl = normalizeImageUrl(p.imageUrl);
    const init = initialById.get(p.id);

    if (init && p.id === 'prod_8' && (!cleanUrl || cleanUrl.includes('cervejas_gelo_balde') || !p.variants)) {
      return {
        ...p,
        name: init.name,
        portionSizeDescription: init.portionSizeDescription,
        variants: init.variants,
        imageUrl: init.imageUrl,
      };
    }

    if (init && p.id === 'prod_10' && (p.name.includes('Guaraná') || !cleanUrl || cleanUrl.includes('refrigerante_lata_gelada'))) {
      return {
        ...p,
        name: init.name,
        unit: init.unit,
        portionSizeDescription: init.portionSizeDescription,
        variants: init.variants,
        imageUrl: init.imageUrl,
      };
    }

    if (init && (p.id === 'prod_7' || p.id === 'prod_11') && !p.variants && init.variants) {
      return {
        ...p,
        name: init.name,
        portionSizeDescription: init.portionSizeDescription,
        variants: init.variants,
        imageUrl: cleanUrl,
      };
    }

    return {
      ...p,
      imageUrl: cleanUrl,
    };
  });

  const removedIds = new Set(safeGet<string[]>(STORAGE_KEYS.REMOVED_PRODUCT_IDS, []));
  const existingIds = new Set(normalized.map((p) => p.id));
  const missing = INITIAL_PRODUCTS.filter(
    (initProd) => !existingIds.has(initProd.id) && !removedIds.has(initProd.id)
  );
  return [...normalized.filter((p) => !removedIds.has(p.id)), ...missing];
}

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
    return normalizeProducts(safeGet<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS));
  }

  static saveProducts(products: Product[]): void {
    safeSet(STORAGE_KEYS.PRODUCTS, normalizeProducts(products));
  }

  static markProductRemoved(productId: string): void {
    const current = safeGet<string[]>(STORAGE_KEYS.REMOVED_PRODUCT_IDS, []);
    if (!current.includes(productId)) {
      safeSet(STORAGE_KEYS.REMOVED_PRODUCT_IDS, [...current, productId]);
    }
  }

  static unmarkProductRemoved(productId: string): void {
    const current = safeGet<string[]>(STORAGE_KEYS.REMOVED_PRODUCT_IDS, []);
    if (current.includes(productId)) {
      safeSet(STORAGE_KEYS.REMOVED_PRODUCT_IDS, current.filter((id) => id !== productId));
    }
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

  static getOpenTabs(): OpenOrderTab[] {
    return safeGet<OpenOrderTab[]>(STORAGE_KEYS.OPEN_TABS, [
      {
        id: 'tab_balcao',
        label: 'Balcão',
        cart: [],
        notes: '',
        discount: 0,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  static saveOpenTabs(tabs: OpenOrderTab[]): void {
    safeSet(STORAGE_KEYS.OPEN_TABS, tabs);
  }

  static getCombos(): ComboOffer[] {
    return safeGet<ComboOffer[]>(
      STORAGE_KEYS.COMBOS,
      INITIAL_COMBOS.map((c) => ({ ...c, active: c.active ?? true }))
    );
  }

  static saveCombos(combos: ComboOffer[]): void {
    safeSet(STORAGE_KEYS.COMBOS, combos);
  }

  static getDailyGoals(): DailyGoalSettings {
    return safeGet<DailyGoalSettings>(STORAGE_KEYS.DAILY_GOALS, DEFAULT_DAILY_GOALS);
  }

  static saveDailyGoals(goals: DailyGoalSettings): void {
    safeSet(STORAGE_KEYS.DAILY_GOALS, goals);
  }

  static getCurrentShift(): RegisterShift | null {
    return safeGet<RegisterShift | null>(STORAGE_KEYS.CURRENT_SHIFT, null);
  }

  static saveCurrentShift(shift: RegisterShift | null): void {
    safeSet(STORAGE_KEYS.CURRENT_SHIFT, shift);
  }

  static getShiftHistory(): RegisterShift[] {
    return safeGet<RegisterShift[]>(STORAGE_KEYS.SHIFT_HISTORY, []);
  }

  static saveShiftHistory(history: RegisterShift[]): void {
    safeSet(STORAGE_KEYS.SHIFT_HISTORY, history);
  }

  // Backup and restore
  static exportFullBackup(): string {
    const backup = {
      version: '1.1',
      exportedAt: new Date().toISOString(),
      products: this.getProducts(),
      customers: this.getCustomers(),
      sales: this.getSales(),
      debtTransactions: this.getDebtTransactions(),
      cashFlow: this.getCashFlow(),
      settings: this.getSettings(),
      combos: this.getCombos(),
      dailyGoals: this.getDailyGoals(),
      currentShift: this.getCurrentShift(),
      shiftHistory: this.getShiftHistory(),
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
      if (data.combos) this.saveCombos(data.combos);
      if (data.dailyGoals) this.saveDailyGoals(data.dailyGoals);
      if (data.currentShift !== undefined) this.saveCurrentShift(data.currentShift);
      if (data.shiftHistory) this.saveShiftHistory(data.shiftHistory);
      return true;
    } catch (err) {
      console.error('Failed to import backup:', err);
      return false;
    }
  }

  static resetToDemo(): void {
    safeSet(STORAGE_KEYS.REMOVED_PRODUCT_IDS, []);
    this.saveProducts(INITIAL_PRODUCTS);
    this.saveCustomers(INITIAL_CUSTOMERS);
    this.saveDebtTransactions(INITIAL_DEBT_TRANSACTIONS);
    this.saveCashFlow(INITIAL_CASH_FLOW);
    this.saveSettings(INITIAL_SETTINGS);
    this.saveSales([]);
    this.saveCombos(INITIAL_COMBOS.map((c) => ({ ...c, active: true })));
    this.saveDailyGoals(DEFAULT_DAILY_GOALS);
    this.saveCurrentShift(null);
    this.saveShiftHistory([]);
  }
}
