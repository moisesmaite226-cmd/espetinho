import { pgTable, text, serial, integer, real, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

// Users table (Firebase Auth linked)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Products table
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  price: real('price').notNull(),
  costPrice: real('cost_price').notNull(),
  stock: integer('stock').notNull(),
  minStock: integer('min_stock').notNull(),
  unit: text('unit').notNull(),
  portionSizeDescription: text('portion_size_description'),
  variants: jsonb('variants'),
  imageUrl: text('image_url'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Customers table (Caderneta de Fiado)
export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nickname: text('nickname'),
  phone: text('phone').notNull(),
  creditLimit: real('credit_limit'),
  totalDebt: real('total_debt').default(0),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  lastPurchaseAt: text('last_purchase_at'),
});

// Sales table (Comandas e Vendas Balcão)
export const sales = pgTable('sales', {
  id: text('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  items: jsonb('items').notNull(),
  total: real('total').notNull(),
  paymentMethod: text('payment_method').notNull(),
  customerId: text('customer_id'),
  customerName: text('customer_name'),
  notes: text('notes'),
});

// Debt Transactions table (Histórico de Compras no Fiado e Baixas de Pagamento)
export const debtTransactions = pgTable('debt_transactions', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  saleId: text('sale_id'),
  type: text('type').notNull(), // 'compra' | 'pagamento'
  amount: real('amount').notNull(),
  remainingDebtAfter: real('remaining_debt_after').notNull(),
  timestamp: text('timestamp').notNull(),
  paymentMethodUsed: text('payment_method_used'),
  description: text('description').notNull(),
  itemsSummary: text('items_summary'),
});

// Cash Flow table (Livro Caixa Diário: Entradas e Saídas)
export const cashFlow = pgTable('cash_flow', {
  id: text('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  type: text('type').notNull(), // 'entrada' | 'saida'
  category: text('category').notNull(),
  amount: real('amount').notNull(),
  description: text('description').notNull(),
  paymentMethod: text('payment_method'),
  referenceId: text('reference_id'),
});

// App Settings table (Configurações do estabelecimento e Pix)
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  storeName: text('store_name').notNull(),
  storeSubtitle: text('store_subtitle'),
  ownerPixKey: text('owner_pix_key'),
  pixKeyType: text('pix_key_type'),
  ownerName: text('owner_name'),
  defaultCreditLimit: real('default_credit_limit'),
});
