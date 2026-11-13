export type ProductCategory = 'espeto' | 'bebida' | 'porcao' | 'molho' | 'outro';

export type SauceOption =
  | 'Sem molho'
  | 'Chimichurri'
  | 'Molho de Alho Cremoso'
  | 'Molho Barbecue Caseiro'
  | 'Vinagrete Clássico';

export interface PortionVariant {
  id: string; // e.g. 'meia', 'inteira', 'individual'
  name: string; // e.g. 'Meia Porção', 'Porção Inteira'
  weightOrVolume?: string; // e.g. '350g', '700g', '1kg'
  servesDescription?: string; // e.g. 'Serve 1-2 pessoas', 'Serve 3-4 pessoas'
  price: number;
  costPrice: number;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  portionSizeDescription?: string; // e.g. "Porção Inteira 700g · Serve até 4"
  variants?: PortionVariant[];
  imageUrl?: string;
  active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  nickname?: string;
  phone: string; // e.g. 11999998888 or (11) 99999-8888
  creditLimit?: number;
  totalDebt: number;
  notes?: string;
  createdAt: string;
  lastPurchaseAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: PortionVariant;
  selectedSauce?: SauceOption;
  displayName: string;
  unitPrice: number;
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'fiado';

export interface SaleItem {
  productId: string;
  name: string;
  variantName?: string;
  sauce?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  timestamp: string;
  items: SaleItem[];
  total: number;
  paymentMethod: PaymentMethod;
  customerId?: string;
  customerName?: string;
  notes?: string;
}

export interface DebtTransaction {
  id: string;
  customerId: string;
  customerName: string;
  saleId?: string;
  type: 'compra' | 'pagamento';
  amount: number;
  remainingDebtAfter: number;
  timestamp: string;
  paymentMethodUsed?: PaymentMethod;
  description: string;
  itemsSummary?: string;
}

export type CashFlowType = 'entrada' | 'saida';

export type CashFlowCategory = 
  | 'venda_vista'
  | 'recebimento_fiado'
  | 'suprimento_troco'
  | 'compra_carne'
  | 'compra_bebidas'
  | 'compra_carvao_gelo'
  | 'embalagens_descartaveis'
  | 'retirada_proprietario'
  | 'outros';

export interface CashFlowEntry {
  id: string;
  timestamp: string;
  type: CashFlowType;
  category: CashFlowCategory;
  amount: number;
  description: string;
  paymentMethod?: PaymentMethod;
  referenceId?: string;
}

export interface AppSettings {
  storeName: string;
  storeSubtitle: string;
  ownerPixKey: string;
  pixKeyType: 'cpf' | 'celular' | 'email' | 'aleatoria';
  ownerName: string;
  defaultCreditLimit: number;
}
