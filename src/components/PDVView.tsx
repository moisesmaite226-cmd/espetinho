import React, { useState, useMemo, useEffect } from 'react';
import {
  Product,
  CartItem,
  Customer,
  PaymentMethod,
  Sale,
  AppSettings,
  PortionVariant,
  OpenOrderTab,
  ComboOffer,
  SplitPaymentDetail,
} from '../types';
import { INITIAL_COMBOS } from '../data/initialData';
import { AppStorage } from '../services/storage';
import {
  formatCurrency,
  sanitizePhoneForWhatsApp,
  buildWhatsAppReceiptMessage,
  formatDisplayPhone,
} from '../utils/formatters';
import {
  matchesProductFilterTab,
  buildSalesCountMap,
  sortProducts,
  ProductSortMode,
} from '../utils/productHelpers';
import {
  Plus,
  Minus,
  Trash2,
  Search,
  UserPlus,
  CheckCircle2,
  Copy,
  AlertCircle,
  Share2,
  Flame,
  Beer,
  UtensilsCrossed,
  Layers,
  ArrowRight,
  Scale,
  Users,
  Droplets,
  ArrowUpDown,
  TrendingUp,
  X,
  Sparkles,
  Tag,
  Split,
  ClipboardList,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';

interface PDVViewProps {
  products: Product[];
  customers: Customer[];
  sales?: Sale[];
  settings: AppSettings;
  onCompleteSale: (
    sale: Sale,
    cart: CartItem[],
    method: PaymentMethod,
    customerId?: string,
    notes?: string
  ) => void;
  onQuickAddCustomer: (customerData: {
    name: string;
    nickname?: string;
    phone: string;
    creditLimit?: number;
  }) => Customer;
}

const DEFAULT_BALCAO_TAB = (): OpenOrderTab => ({
  id: 'tab_balcao',
  label: 'Balcão',
  cart: [],
  notes: '',
  discount: 0,
  createdAt: new Date().toISOString(),
});

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  dinheiro: '💵 Dinheiro',
  pix: '📱 Pix',
  cartao_debito: '💳 Cartão',
  cartao_credito: '💳 Crédito',
  fiado: '📒 FIADO',
};

export const PDVView: React.FC<PDVViewProps> = ({
  products,
  customers,
  sales = [],
  settings,
  onCompleteSale,
  onQuickAddCustomer,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [sortMode, setSortMode] = useState<ProductSortMode>('mais_vendidos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCombos, setShowCombos] = useState(true);

  // Multi-table / open comandas persisted in localStorage
  const [openTabs, setOpenTabs] = useState<OpenOrderTab[]>(() => {
    const loaded = AppStorage.getOpenTabs();
    return loaded.length > 0 ? loaded : [DEFAULT_BALCAO_TAB()];
  });
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const loaded = AppStorage.getOpenTabs();
    return loaded[0]?.id || 'tab_balcao';
  });

  useEffect(() => {
    AppStorage.saveOpenTabs(openTabs);
  }, [openTabs]);

  const activeTab = useMemo(
    () => openTabs.find((t) => t.id === activeTabId) || openTabs[0] || DEFAULT_BALCAO_TAB(),
    [openTabs, activeTabId]
  );

  const cart = activeTab.cart;
  const tabDiscount = activeTab.discount || 0;

  // Modals & UI drawers
  const [variantModalProduct, setVariantModalProduct] = useState<Product | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isNewTableModalOpen, setIsNewTableModalOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [pendingCloseTabId, setPendingCloseTabId] = useState<string | null>(null);
  const [isKitchenModalOpen, setIsKitchenModalOpen] = useState(false);
  const [copiedKitchen, setCopiedKitchen] = useState(false);

  // Out-of-stock inline confirmation
  const [pendingStockConfirm, setPendingStockConfirm] = useState<
    | { type: 'item'; product: Product; variant?: PortionVariant }
    | { type: 'combo'; combo: ComboOffer; outOfStockNames: string[] }
    | null
  >(null);

  // Checkout Modal states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('dinheiro');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [discountInput, setDiscountInput] = useState<string>('');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitPrimaryMethod, setSplitPrimaryMethod] = useState<PaymentMethod>('pix');
  const [splitSecondaryMethod, setSplitSecondaryMethod] = useState<PaymentMethod>('dinheiro');
  const [splitPrimaryAmountInput, setSplitPrimaryAmountInput] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [overrideCreditLimit, setOverrideCreditLimit] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Quick New Customer Modal
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustNickname, setNewCustNickname] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [quickCustError, setQuickCustError] = useState('');

  // Post-sale receipt modal
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  const salesCountMap = useMemo(() => buildSalesCountMap(sales), [sales]);

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((p) => {
      if (!p.active) return false;
      const matchesCat = matchesProductFilterTab(p, selectedCategory);
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
    return sortProducts(filtered, sortMode, salesCountMap);
  }, [products, selectedCategory, searchQuery, sortMode, salesCountMap]);

  const cartSubtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const cartNetTotal = Math.max(0, cartSubtotal - tabDiscount);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const updateActiveTab = (updater: (tab: OpenOrderTab) => OpenOrderTab) => {
    setOpenTabs((prev) =>
      prev.map((tab) => (tab.id === activeTab.id ? updater(tab) : tab))
    );
  };

  const getCartItemKey = (productId: string, variantId?: string) =>
    variantId ? `${productId}_${variantId}` : productId;

  const commitItemToCart = (product: Product, variant?: PortionVariant) => {
    const unitPrice = variant ? variant.price : product.price;
    const displayName = variant
      ? `${product.name} (${variant.name}${variant.weightOrVolume ? ` ${variant.weightOrVolume}` : ''})`
      : product.name;
    const itemKey = getCartItemKey(product.id, variant?.id);

    updateActiveTab((tab) => {
      const existingIndex = tab.cart.findIndex(
        (item) => getCartItemKey(item.product.id, item.selectedVariant?.id) === itemKey
      );
      if (existingIndex >= 0) {
        return {
          ...tab,
          cart: tab.cart.map((item, idx) =>
            idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
          ),
        };
      }
      return {
        ...tab,
        cart: [
          ...tab.cart,
          {
            product,
            quantity: 1,
            selectedVariant: variant,
            displayName,
            unitPrice,
          },
        ],
      };
    });

    if (variantModalProduct) {
      setVariantModalProduct(null);
    }
  };

  const addToCart = (product: Product, variant?: PortionVariant, force = false) => {
    if (!force && product.stock <= 0) {
      setPendingStockConfirm({ type: 'item', product, variant });
      return;
    }
    commitItemToCart(product, variant);
  };

  const handleProductCardClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setVariantModalProduct(product);
    } else {
      addToCart(product);
    }
  };

  const commitComboToCart = (combo: ComboOffer) => {
    let regularSum = 0;
    const resolvedEntries: { product: Product; variant?: PortionVariant; quantity: number }[] = [];

    for (const entry of combo.items) {
      const prod = products.find((p) => p.id === entry.productId && p.active);
      if (!prod) continue;
      const variant = entry.variantId
        ? prod.variants?.find((v) => v.id === entry.variantId)
        : undefined;
      const unitPrice = variant ? variant.price : prod.price;
      regularSum += unitPrice * entry.quantity;
      resolvedEntries.push({ product: prod, variant, quantity: entry.quantity });
    }

    if (resolvedEntries.length === 0) return;

    const comboSavings = Math.max(0, Number((regularSum - combo.promoPrice).toFixed(2)));

    updateActiveTab((tab) => {
      let nextCart = [...tab.cart];
      for (const { product, variant, quantity } of resolvedEntries) {
        const unitPrice = variant ? variant.price : product.price;
        const displayName = variant
          ? `${product.name} (${variant.name}${variant.weightOrVolume ? ` ${variant.weightOrVolume}` : ''})`
          : product.name;
        const itemKey = getCartItemKey(product.id, variant?.id);
        const existingIndex = nextCart.findIndex(
          (item) => getCartItemKey(item.product.id, item.selectedVariant?.id) === itemKey
        );
        if (existingIndex >= 0) {
          nextCart[existingIndex] = {
            ...nextCart[existingIndex],
            quantity: nextCart[existingIndex].quantity + quantity,
          };
        } else {
          nextCart.push({
            product,
            quantity,
            selectedVariant: variant,
            displayName,
            unitPrice,
          });
        }
      }

      return {
        ...tab,
        cart: nextCart,
        discount: Number(((tab.discount || 0) + comboSavings).toFixed(2)),
      };
    });
  };

  const handleAddCombo = (combo: ComboOffer) => {
    const outOfStockNames: string[] = [];
    for (const entry of combo.items) {
      const prod = products.find((p) => p.id === entry.productId && p.active);
      if (prod && prod.stock <= 0) {
        outOfStockNames.push(prod.name);
      }
    }
    if (outOfStockNames.length > 0) {
      setPendingStockConfirm({ type: 'combo', combo, outOfStockNames });
      return;
    }
    commitComboToCart(combo);
  };

  const updateQuantity = (cartKey: string, delta: number) => {
    updateActiveTab((tab) => ({
      ...tab,
      cart: tab.cart
        .map((item) => {
          if (getCartItemKey(item.product.id, item.selectedVariant?.id) === cartKey) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[],
    }));
  };

  const removeFromCart = (cartKey: string) => {
    updateActiveTab((tab) => ({
      ...tab,
      cart: tab.cart.filter(
        (item) => getCartItemKey(item.product.id, item.selectedVariant?.id) !== cartKey
      ),
    }));
  };

  const clearCart = () => {
    updateActiveTab((tab) => ({
      ...tab,
      cart: [],
      discount: 0,
      notes: '',
    }));
  };

  // Multi-table management
  const handleCreateTable = (label: string) => {
    const clean = label.trim();
    if (!clean) return;
    const existing = openTabs.find((t) => t.label.toLowerCase() === clean.toLowerCase());
    if (existing) {
      setActiveTabId(existing.id);
      setIsNewTableModalOpen(false);
      setNewTableName('');
      return;
    }
    const created: OpenOrderTab = {
      id: `tab_${Date.now()}`,
      label: clean,
      cart: [],
      notes: '',
      discount: 0,
      createdAt: new Date().toISOString(),
    };
    setOpenTabs((prev) => [...prev, created]);
    setActiveTabId(created.id);
    setIsNewTableModalOpen(false);
    setNewTableName('');
  };

  const executeCloseTab = (tabId: string) => {
    setPendingCloseTabId(null);
    if (openTabs.length <= 1) {
      setOpenTabs([DEFAULT_BALCAO_TAB()]);
      setActiveTabId('tab_balcao');
      return;
    }
    const remaining = openTabs.filter((t) => t.id !== tabId);
    setOpenTabs(remaining);
    if (activeTab.id === tabId) {
      setActiveTabId(remaining[0].id);
    }
  };

  const requestCloseTab = (tab: OpenOrderTab) => {
    if (tab.cart.length > 0) {
      setPendingCloseTabId(tab.id);
    } else {
      executeCloseTab(tab.id);
    }
  };

  // Parse money helper
  const parseAmountInput = (raw: string): number => {
    const cleaned = raw.replace(/[^\d.,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    const initialDisc = tabDiscount > 0 ? tabDiscount.toFixed(2).replace('.', ',') : '';
    const initialFinal = Math.max(0, cartSubtotal - tabDiscount);
    setDiscountInput(initialDisc);
    setSaleNotes(activeTab.notes || '');
    setCashGiven('');
    setIsSplitPayment(false);
    setSplitPrimaryMethod('pix');
    setSplitSecondaryMethod('dinheiro');
    setSplitPrimaryAmountInput((initialFinal / 2).toFixed(2).replace('.', ','));
    setOverrideCreditLimit(false);
    setCheckoutError('');
    setIsMobileCartOpen(false);
    setIsCheckoutOpen(true);
  };

  // Discount and Final Total in Checkout
  const discountNum = Math.min(cartSubtotal, Math.max(0, parseAmountInput(discountInput)));
  const finalTotal = Math.max(0, Number((cartSubtotal - discountNum).toFixed(2)));

  // Split calculation
  const splitPrimaryAmount = Math.max(
    0,
    Math.min(finalTotal, Number(parseAmountInput(splitPrimaryAmountInput).toFixed(2)))
  );
  const splitSecondaryAmount = Math.max(0, Number((finalTotal - splitPrimaryAmount).toFixed(2)));
  const splitInvalid = isSplitPayment && (splitPrimaryAmount <= 0 || splitSecondaryAmount <= 0);

  // Cash change calculation (works for single 'dinheiro' OR whichever leg is 'dinheiro' in split)
  const cashLegAmount = !isSplitPayment
    ? selectedMethod === 'dinheiro'
      ? finalTotal
      : 0
    : (splitPrimaryMethod === 'dinheiro' ? splitPrimaryAmount : 0) +
      (splitSecondaryMethod === 'dinheiro' ? splitSecondaryAmount : 0);

  const hasCashLeg =
    (!isSplitPayment && selectedMethod === 'dinheiro') ||
    (isSplitPayment &&
      (splitPrimaryMethod === 'dinheiro' || splitSecondaryMethod === 'dinheiro'));

  const hasPixLeg =
    (!isSplitPayment && selectedMethod === 'pix') ||
    (isSplitPayment && (splitPrimaryMethod === 'pix' || splitSecondaryMethod === 'pix'));

  const hasFiadoLeg =
    (!isSplitPayment && selectedMethod === 'fiado') ||
    (isSplitPayment &&
      (splitPrimaryMethod === 'fiado' || splitSecondaryMethod === 'fiado'));

  const fiadoLegAmount = !isSplitPayment
    ? selectedMethod === 'fiado'
      ? finalTotal
      : 0
    : (splitPrimaryMethod === 'fiado' ? splitPrimaryAmount : 0) +
      (splitSecondaryMethod === 'fiado' ? splitSecondaryAmount : 0);

  const hasCashInput = cashGiven.trim().length > 0;
  const cashGivenNumber = hasCashInput ? parseAmountInput(cashGiven) : cashLegAmount;
  const missingCash =
    hasCashLeg && hasCashInput && cashGivenNumber < cashLegAmount
      ? Number((cashLegAmount - cashGivenNumber).toFixed(2))
      : 0;
  const changeDue =
    hasCashLeg && hasCashInput && cashGivenNumber > cashLegAmount
      ? Number((cashGivenNumber - cashLegAmount).toFixed(2))
      : 0;

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const willExceedCredit =
    hasFiadoLeg && selectedCustomer && selectedCustomer.creditLimit
      ? selectedCustomer.totalDebt + fiadoLegAmount > selectedCustomer.creditLimit
      : false;

  const cannotConfirmSale =
    (hasCashLeg && missingCash > 0) ||
    splitInvalid ||
    (willExceedCredit && !overrideCreditLimit);

  const handleConfirmSale = () => {
    setCheckoutError('');

    if (hasFiadoLeg && !selectedCustomerId) {
      setCheckoutError('Selecione ou cadastre o cliente para anotar a parte no Fiado.');
      return;
    }

    if (willExceedCredit && !overrideCreditLimit) {
      setCheckoutError('Marque a autorização de limite excedido para concluir no Fiado.');
      return;
    }

    if (splitInvalid) {
      setCheckoutError('Na divisão Meio a Meio, os dois valores precisam ser maiores que R$ 0,00.');
      return;
    }

    if (hasCashLeg && missingCash > 0) {
      setCheckoutError('Valor em dinheiro menor que o valor a pagar.');
      return;
    }

    const saleItems = cart.map((item) => {
      const unitCost = item.selectedVariant ? item.selectedVariant.costPrice : item.product.costPrice;
      const subtotal = item.unitPrice * item.quantity;
      const totalCost = unitCost * item.quantity;
      const netProfit = subtotal - totalCost;
      return {
        productId: item.product.id,
        name: item.displayName,
        variantName: item.selectedVariant?.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost,
        subtotal,
        totalCost,
        netProfit,
      };
    });

    const saleTotalCost = saleItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const saleNetProfit = finalTotal - saleTotalCost;

    const splitDetail: SplitPaymentDetail | undefined = isSplitPayment
      ? {
          primaryMethod: splitPrimaryMethod,
          primaryAmount: splitPrimaryAmount,
          secondaryMethod: splitSecondaryMethod,
          secondaryAmount: splitSecondaryAmount,
        }
      : undefined;

    const effectiveMethod: PaymentMethod = isSplitPayment
      ? splitPrimaryMethod === 'fiado' || splitSecondaryMethod === 'fiado'
        ? splitPrimaryMethod === 'fiado' && splitSecondaryMethod === 'fiado'
          ? 'fiado'
          : splitPrimaryMethod
        : splitPrimaryMethod
      : selectedMethod;

    const sale: Sale = {
      id: `sale_${Date.now()}`,
      timestamp: new Date().toISOString(),
      items: saleItems,
      total: finalTotal,
      discount: discountNum > 0 ? discountNum : undefined,
      totalCost: saleTotalCost,
      netProfit: saleNetProfit,
      paymentMethod: effectiveMethod,
      splitPayment: splitDetail,
      cashReceived: hasCashLeg ? cashGivenNumber : undefined,
      changeGiven: hasCashLeg ? changeDue : undefined,
      customerId: hasFiadoLeg ? selectedCustomerId : undefined,
      customerName:
        hasFiadoLeg && selectedCustomer
          ? selectedCustomer.nickname
            ? `${selectedCustomer.name} (${selectedCustomer.nickname})`
            : selectedCustomer.name
          : undefined,
      tableLabel: activeTab.label,
      notes: saleNotes.trim() || undefined,
    };

    onCompleteSale(sale, cart, effectiveMethod, hasFiadoLeg ? selectedCustomerId : undefined, saleNotes);
    setCompletedSale(sale);

    // Clear finished tab (or remove extra table tab and return to Balcão)
    if (openTabs.length > 1 && activeTab.id !== 'tab_balcao') {
      const remaining = openTabs.filter((t) => t.id !== activeTab.id);
      setOpenTabs(remaining);
      setActiveTabId(remaining[0].id);
    } else {
      updateActiveTab((tab) => ({ ...tab, cart: [], discount: 0, notes: '' }));
    }

    setIsCheckoutOpen(false);
    setCashGiven('');
    setDiscountInput('');
    setSelectedCustomerId('');
    setSaleNotes('');
    setOverrideCreditLimit(false);
  };

  const handleCreateQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      setQuickCustError('Preencha pelo menos Nome e WhatsApp!');
      return;
    }
    setQuickCustError('');
    const created = onQuickAddCustomer({
      name: newCustName.trim(),
      nickname: newCustNickname.trim() || undefined,
      phone: newCustPhone.trim(),
      creditLimit: settings.defaultCreditLimit,
    });
    setSelectedCustomerId(created.id);
    setIsQuickCustomerOpen(false);
    setNewCustName('');
    setNewCustNickname('');
    setNewCustPhone('');
  };

  const handleCopyPix = () => {
    if (settings.ownerPixKey) {
      navigator.clipboard.writeText(settings.ownerPixKey);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    }
  };

  const handleCopyKitchenOrder = () => {
    const lines = [
      `🔥 PEDIDO PARA CHURRASQUEIRA — ${activeTab.label.toUpperCase()}`,
      ...cart.map((item) => `• ${item.quantity}x ${item.displayName}`),
      activeTab.notes.trim() ? `\n📝 Obs: ${activeTab.notes.trim()}` : '',
    ].filter(Boolean);
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedKitchen(true);
    setTimeout(() => setCopiedKitchen(false), 2500);
  };

  const renderComandaBody = (inMobileDrawer = false) => (
    <div
      className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col shadow-xl ${
        inMobileDrawer ? 'h-full' : 'sticky top-20 min-h-[520px]'
      }`}
    >
      {/* Multi-Table Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-2.5 border-b border-neutral-800 scrollbar-thin">
        {openTabs.map((tab) => {
          const isActive = tab.id === activeTab.id;
          const count = tab.cart.reduce((s, i) => s + i.quantity, 0);
          return (
            <div
              key={tab.id}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors border ${
                isActive
                  ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-sm'
                  : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className="flex items-center gap-1.5"
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-neutral-950 text-amber-400'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
              {openTabs.length > 1 && (
                <button
                  type="button"
                  onClick={() => requestCloseTab(tab)}
                  className={`ml-0.5 rounded p-0.5 ${
                    isActive
                      ? 'hover:bg-neutral-950/20 text-neutral-950'
                      : 'hover:bg-neutral-800 text-neutral-500 hover:text-rose-400'
                  }`}
                  title={`Fechar ${tab.label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setIsNewTableModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-neutral-700 whitespace-nowrap shrink-0 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Mesa</span>
        </button>
      </div>

      {/* Cart Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider truncate">
            {activeTab.label}
          </h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-amber-400 font-semibold whitespace-nowrap">
            {cartItemCount} itens
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {cart.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setIsKitchenModalOpen(true)}
                className="text-xs bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30 px-2 py-1 rounded-lg flex items-center gap-1 font-semibold whitespace-nowrap transition-colors"
                title="Visualizar pedido em letras grandes para churrasqueira"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Churrasqueira</span>
              </button>

              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-neutral-400 hover:text-rose-400 flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            </>
          )}

          {inMobileDrawer && (
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(false)}
              className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cart Items List */}
      <div
        className={`flex-1 overflow-y-auto py-3 space-y-2.5 scrollbar-thin ${
          inMobileDrawer ? '' : 'max-h-[400px]'
        }`}
      >
        {cart.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-center text-neutral-500">
            <UtensilsCrossed className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-xs font-medium">Nenhum item em {activeTab.label}.</p>
            <p className="text-[11px] text-neutral-600 mt-1 max-w-[210px]">
              Toque nos combos, espetos, porções ou bebidas para montar o pedido.
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const cartKey = getCartItemKey(item.product.id, item.selectedVariant?.id);

            return (
              <div
                key={cartKey}
                className="bg-neutral-950 border border-neutral-800/90 rounded-xl p-3 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{item.product.name}</p>
                    {item.selectedVariant ? (
                      <div className="flex items-center gap-1 text-[11px] text-amber-400">
                        <Scale className="w-3 h-3" />
                        <span>
                          {item.selectedVariant.name} ({item.selectedVariant.weightOrVolume})
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-neutral-500">
                        {item.product.portionSizeDescription || item.product.unit}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(cartKey)}
                    className="text-neutral-500 hover:text-rose-400 p-1 transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-neutral-900">
                  <div className="flex items-center gap-1.5 shrink-0 bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                    <button
                      type="button"
                      onClick={() => updateQuantity(cartKey, -1)}
                      className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center text-xs font-mono font-bold text-white tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(cartKey, 1)}
                      className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-neutral-500 font-mono block">
                      {formatCurrency(item.unitPrice)} un
                    </span>
                    <span className="text-xs font-bold font-mono text-amber-400 tabular-nums">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Quick Paid Sauce Add-on Bar when cart has espeto or porcao */}
        {cart.some((i) => i.product.category === 'espeto' || i.product.category === 'porcao') &&
          (() => {
            const paidSauces = products.filter((p) => p.category === 'molho' && p.active);
            if (paidSauces.length === 0) return null;
            return (
              <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-2.5 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-amber-400" />
                  <span>Adicionar Molho (Pago à parte):</span>
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {paidSauces.map((sauceProd) => {
                    const baseVariant = sauceProd.variants?.[0];
                    const priceToAdd = baseVariant ? baseVariant.price : sauceProd.price;
                    const shortLabel = sauceProd.name
                      .replace(' Artesanal da Casa', '')
                      .replace(' Clássico de Boteco', '')
                      .replace('Molho de ', '')
                      .replace('Molho ', '');

                    return (
                      <button
                        key={sauceProd.id}
                        type="button"
                        onClick={() => addToCart(sauceProd, baseVariant)}
                        className="px-2 py-1.5 bg-neutral-900 hover:bg-amber-500/20 hover:border-amber-500/70 border border-neutral-800 rounded-lg text-left transition-colors flex items-center justify-between gap-1"
                      >
                        <span className="text-[11px] font-medium text-neutral-200 truncate">
                          + {shortLabel}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-amber-400 shrink-0 tabular-nums">
                          {formatCurrency(priceToAdd)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

        {/* Table/Kitchen Notes inside Comanda */}
        {cart.length > 0 && (
          <div className="pt-1">
            <input
              type="text"
              placeholder="Obs. da comanda (ex: ponto da carne, sem cebola)..."
              value={activeTab.notes}
              onChange={(e) =>
                updateActiveTab((tab) => ({ ...tab, notes: e.target.value }))
              }
              className="w-full px-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 focus:border-amber-500 focus:outline-none rounded-lg text-white placeholder-neutral-600"
            />
          </div>
        )}
      </div>

      {/* Cart Footer */}
      <div className="border-t border-neutral-800 pt-3 mt-auto space-y-2.5">
        {tabDiscount > 0 && (
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              Desconto Combo / Promocional
            </span>
            <span className="font-mono font-bold tabular-nums">
              - {formatCurrency(tabDiscount)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-neutral-300">
          <span className="text-xs font-medium">Total da Venda</span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {formatCurrency(cartNetTotal)}
          </span>
        </div>

        <button
          type="button"
          disabled={cart.length === 0}
          onClick={handleOpenCheckout}
          className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            cart.length > 0
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 shadow-lg shadow-orange-500/20 active:scale-[0.99] cursor-pointer'
              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
          }`}
        >
          <span>Fechar {activeTab.label} ({cartItemCount} itens)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24 lg:pb-0">
      {/* Left Column: Products Showcase (8 cols) */}
      <div className="lg:col-span-8 space-y-4">
        {/* Category Filter, Sort & Search Bar */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 space-y-2.5 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCategory('todos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === 'todos'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Todos ({products.filter((p) => p.active).length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('espeto')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === 'espeto'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                Espetinhos
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('porcao')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === 'porcao'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                Porções (Tamanhos)
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('bebida')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === 'bebida'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Beer className="w-3.5 h-3.5" />
                Bebidas Geladas
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('molho')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === 'molho'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Droplets className="w-3.5 h-3.5" />
                Molhos
              </button>
            </div>

            <div className="relative min-w-[190px] lg:w-56 shrink-0">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar cerveja, coca, espeto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/80">
            <span className="text-[11px] text-neutral-400">
              Mostrando <strong className="text-neutral-200 font-mono">{filteredProducts.length}</strong> itens
              {selectedCategory === 'bebida' && ' (Cervejas, Coca-Cola, Guaraná, Sucos, Água e Energético)'}
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-neutral-500 font-medium mr-0.5">Organizar:</span>
              <button
                type="button"
                onClick={() => setSortMode('mais_vendidos')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  sortMode === 'mais_vendidos'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60'
                    : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                Mais Vendidos
              </button>
              <button
                type="button"
                onClick={() => setSortMode('alfabetica')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  sortMode === 'alfabetica'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60'
                    : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                }`}
              >
                <ArrowUpDown className="w-3 h-3" />
                Ordem Alfabética (A–Z)
              </button>
            </div>
          </div>
        </div>

        {/* Promotional Combos Strip */}
        {(() => {
          const availableCombos = INITIAL_COMBOS.filter((combo) =>
            combo.items.every((entry) =>
              products.some((p) => p.id === entry.productId && p.active)
            )
          );
          if (availableCombos.length === 0) return null;
          return (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 shadow-sm">
              <button
                type="button"
                onClick={() => setShowCombos((v) => !v)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Combos Prontos (1 Toque)
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Desconto Automático
                  </span>
                </div>
                {showCombos ? (
                  <ChevronUp className="w-4 h-4 text-neutral-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-neutral-400" />
                )}
              </button>

              {showCombos && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3">
                  {availableCombos.map((combo) => (
                    <button
                      key={combo.id}
                      type="button"
                      onClick={() => handleAddCombo(combo)}
                      className="bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 hover:border-amber-500/70 rounded-xl p-3 text-left transition-all flex flex-col justify-between gap-2 group active:scale-[0.99]"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                            {combo.name}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                            {combo.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 leading-snug">{combo.description}</p>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-900">
                        <span className="text-sm font-mono font-bold text-amber-400 tabular-nums">
                          {formatCurrency(combo.promoPrice)}
                        </span>
                        <span className="text-[11px] font-bold text-amber-300 flex items-center gap-0.5">
                          <Plus className="w-3.5 h-3.5" />
                          Lançar Combo
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filteredProducts.map((product) => {
            const hasVariants = product.variants && product.variants.length > 0;
            const isLowStock = product.stock <= product.minStock;

            const inCartQty = cart
              .filter((item) => item.product.id === product.id)
              .reduce((sum, item) => sum + item.quantity, 0);

            return (
              <div
                key={product.id}
                className={`group relative bg-neutral-900 border rounded-2xl overflow-hidden transition-all flex flex-col justify-between ${
                  inCartQty > 0
                    ? 'border-amber-500/80 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/40'
                    : 'border-neutral-800/80 hover:border-neutral-700'
                }`}
              >
                <div
                  onClick={() => handleProductCardClick(product)}
                  className="h-40 sm:h-44 w-full bg-neutral-800 relative overflow-hidden cursor-pointer flex items-center justify-center select-none"
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900 text-neutral-500">
                      {product.category === 'espeto' && <Flame className="w-10 h-10 text-orange-400/50" />}
                      {product.category === 'bebida' && <Beer className="w-10 h-10 text-amber-400/50" />}
                      {product.category === 'porcao' && <UtensilsCrossed className="w-10 h-10 text-amber-500/50" />}
                      {product.category === 'molho' && <Droplets className="w-10 h-10 text-emerald-400/50" />}
                      {product.category === 'outro' && <Layers className="w-10 h-10 text-neutral-500" />}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent pointer-events-none" />

                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold backdrop-blur-sm ${
                        product.stock <= 0
                          ? 'bg-rose-500/90 text-white'
                          : isLowStock
                          ? 'bg-amber-500 text-neutral-950'
                          : 'bg-neutral-950/80 text-neutral-300 border border-neutral-700/80'
                      }`}
                    >
                      {product.stock <= 0 ? 'Esgotado' : `${product.stock} un`}
                    </span>
                  </div>

                  {product.portionSizeDescription && (
                    <div className="absolute top-2.5 right-2.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-950/85 text-amber-300 border border-amber-500/30 backdrop-blur-sm flex items-center gap-1">
                        <Scale className="w-3 h-3 text-amber-400" />
                        <span>{product.portionSizeDescription.split('·')[0]}</span>
                      </span>
                    </div>
                  )}

                  {inCartQty > 0 && (
                    <div className="absolute bottom-2.5 right-2.5 bg-amber-500 text-neutral-950 font-bold text-xs px-2.5 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                      <span>{inCartQty} no pedido</span>
                    </div>
                  )}
                </div>

                <div className="p-3.5 flex flex-col justify-between flex-1 space-y-3">
                  <div>
                    <h3
                      onClick={() => handleProductCardClick(product)}
                      className="text-sm font-bold text-white hover:text-amber-400 transition-colors cursor-pointer leading-snug line-clamp-2"
                    >
                      {product.name}
                    </h3>

                    {product.portionSizeDescription && (
                      <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
                        <span className="text-amber-400/90 font-medium">
                          {product.portionSizeDescription}
                        </span>
                      </p>
                    )}
                  </div>

                  {hasVariants ? (
                    <div className="space-y-1.5 pt-1 border-t border-neutral-800/80">
                      <span className="text-[10px] font-semibold uppercase text-neutral-400 tracking-wider flex items-center gap-1">
                        <Scale className="w-3 h-3 text-amber-400" />
                        {product.category === 'bebida'
                          ? 'Escolha o Tamanho / Volume:'
                          : product.category === 'molho'
                          ? 'Escolha o Tamanho do Pote:'
                          : 'Escolha o Tamanho da Porção:'}
                      </span>

                      <div className="grid grid-cols-2 gap-1.5">
                        {product.variants!.map((variant, idx) => {
                          const variantInCartQty = cart
                            .filter((c) => c.product.id === product.id && c.selectedVariant?.id === variant.id)
                            .reduce((sum, c) => sum + c.quantity, 0);
                          const variantInCart = variantInCartQty > 0;
                          const isLastOdd =
                            product.variants!.length % 2 === 1 && idx === product.variants!.length - 1;

                          return (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => addToCart(product, variant)}
                              className={`p-2 rounded-xl border text-left transition-all active:scale-[0.98] ${
                                isLastOdd ? 'col-span-2' : ''
                              } ${
                                variantInCart
                                  ? 'bg-amber-500/20 border-amber-500/80 text-amber-300'
                                  : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-xs truncate">{variant.name}</span>
                                {variantInCart && (
                                  <span className="text-[10px] font-bold bg-amber-500 text-neutral-950 px-1.5 rounded-full">
                                    {variantInCartQty}
                                  </span>
                                )}
                              </div>

                              <div className="text-[10px] text-neutral-400 truncate">
                                {variant.weightOrVolume}{' '}
                                {variant.servesDescription ? `· ${variant.servesDescription}` : ''}
                              </div>

                              <div className="text-xs font-mono font-bold text-amber-400 tabular-nums mt-1">
                                {formatCurrency(variant.price)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-neutral-500 uppercase block text-[10px] font-medium">
                          Preço
                        </span>
                        <span className="text-base font-bold font-mono text-amber-400 tabular-nums">
                          {formatCurrency(product.price)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => addToCart(product)}
                        className="py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-12 text-center bg-neutral-900 border border-neutral-800 rounded-xl">
            <Search className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-400">Nenhum produto ou porção encontrada.</p>
          </div>
        )}
      </div>

      {/* Desktop Right Column: Interactive Multi-Tab Cart & Checkout (4 cols) */}
      <div className="hidden lg:block lg:col-span-4">{renderComandaBody(false)}</div>

      {/* Mobile Sticky Bottom Cart Bar (< lg screens) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800 px-3 py-2.5 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="flex items-center gap-2.5 text-left min-w-0 flex-1"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 relative">
              <ShoppingBag className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-bold flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-neutral-400 font-medium truncate">
                {activeTab.label} · {cartItemCount} {cartItemCount === 1 ? 'item' : 'itens'}
              </div>
              <div className="text-base font-mono font-bold text-amber-400 tabular-nums">
                {formatCurrency(cartNetTotal)}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold whitespace-nowrap"
            >
              Ver Comanda
            </button>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleOpenCheckout}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 text-xs font-bold whitespace-nowrap shadow-md"
              >
                Cobrar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Full-Height Comanda Drawer */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="h-[88vh] w-full rounded-t-2xl overflow-hidden">
            {renderComandaBody(true)}
          </div>
        </div>
      )}

      {/* New Table / Comanda Modal */}
      {isNewTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-white">Abrir Nova Mesa / Comanda</h3>
              <button
                type="button"
                onClick={() => setIsNewTableModalOpen(false)}
                className="text-neutral-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] text-neutral-400 block">Atalhos rápidos:</span>
              <div className="grid grid-cols-3 gap-2">
                {['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4', 'Mesa 5', 'Viagem'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleCreateTable(preset)}
                    className="py-2 px-2.5 text-xs font-semibold bg-neutral-950 hover:bg-amber-500 hover:text-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateTable(newTableName);
              }}
              className="space-y-3 pt-2 border-t border-neutral-800"
            >
              <div>
                <label className="text-xs text-neutral-300 block mb-1">
                  Ou digite o nome / cliente:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mesa da Calçada, João..."
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTableModalOpen(false)}
                  className="px-3 py-1.5 text-xs bg-neutral-800 text-neutral-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newTableName.trim()}
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 rounded-lg"
                >
                  Abrir Comanda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Non-Empty Tab Confirmation Modal */}
      {pendingCloseTabId && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Fechar comanda com itens?</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Essa comanda ainda tem itens não cobrados. Se fechar a aba agora, o pedido dela será descartado.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingCloseTabId(null)}
                className="px-3.5 py-2 text-xs font-semibold bg-neutral-800 text-neutral-300 rounded-xl"
              >
                Manter Aberta
              </button>
              <button
                type="button"
                onClick={() => executeCloseTab(pendingCloseTabId)}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl"
              >
                Descartar Comanda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Out-of-Stock Confirmation Modal */}
      {pendingStockConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-amber-500/40 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Item Esgotado no Estoque (0 un)</h3>
                <p className="text-xs text-neutral-300 mt-1">
                  {pendingStockConfirm.type === 'item'
                    ? `"${pendingStockConfirm.product.name}" está zerado no controle de estoque.`
                    : `Os itens (${pendingStockConfirm.outOfStockNames.join(', ')}) estão zerados no estoque.`}
                </p>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Se você acabou de repor na geladeira ou churrasqueira, pode adicionar normalmente.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingStockConfirm(null)}
                className="px-3.5 py-2 text-xs font-semibold bg-neutral-800 text-neutral-300 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingStockConfirm.type === 'item') {
                    commitItemToCart(pendingStockConfirm.product, pendingStockConfirm.variant);
                  } else {
                    commitComboToCart(pendingStockConfirm.combo);
                  }
                  setPendingStockConfirm(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl"
              >
                Adicionar Mesmo Assim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kitchen / Grill View Modal ("Pedido para Churrasqueira") */}
      {isKitchenModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border-2 border-orange-500/60 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="text-base font-extrabold text-white uppercase tracking-wide">
                    Pedido p/ Churrasqueira
                  </h3>
                  <p className="text-xs text-amber-400 font-semibold">
                    {activeTab.label} · {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsKitchenModalOpen(false)}
                className="p-1.5 rounded-lg bg-neutral-900 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
              {cart.map((item) => {
                const key = getCartItemKey(item.product.id, item.selectedVariant?.id);
                return (
                  <div
                    key={key}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex items-center gap-3"
                  >
                    <span className="min-w-[44px] h-11 rounded-xl bg-amber-500 text-neutral-950 font-mono font-extrabold text-xl flex items-center justify-center shrink-0">
                      {item.quantity}x
                    </span>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-white leading-tight">
                        {item.product.name}
                      </p>
                      {item.selectedVariant && (
                        <p className="text-xs font-semibold text-amber-300 mt-0.5">
                          {item.selectedVariant.name} ({item.selectedVariant.weightOrVolume})
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {activeTab.notes.trim() && (
              <div className="bg-orange-950/40 border border-orange-700/60 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase text-orange-300 block">
                  Observação da Cozinha / Brasa:
                </span>
                <p className="text-sm font-bold text-white mt-0.5">{activeTab.notes}</p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyKitchenOrder}
                className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Copy className="w-4 h-4 text-amber-400" />
                <span>{copiedKitchen ? 'Pedido Copiado!' : 'Copiar Pedido'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsKitchenModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portion Detail / Variant Modal */}
      {variantModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  {variantModalProduct.category === 'bebida' ? (
                    <Beer className="w-4 h-4 text-amber-400" />
                  ) : variantModalProduct.category === 'molho' ? (
                    <Droplets className="w-4 h-4 text-amber-400" />
                  ) : (
                    <UtensilsCrossed className="w-4 h-4 text-amber-400" />
                  )}
                  <span>
                    {variantModalProduct.category === 'bebida'
                      ? 'Escolha o Tamanho / Volume'
                      : variantModalProduct.category === 'molho'
                      ? 'Escolha o Tamanho do Pote'
                      : 'Escolha o Tamanho da Porção'}
                  </span>
                </h3>
                <p className="text-xs text-neutral-400">{variantModalProduct.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setVariantModalProduct(null)}
                className="text-neutral-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {variantModalProduct.imageUrl && (
              <div className="h-44 w-full rounded-xl overflow-hidden relative border border-neutral-800">
                <img
                  src={variantModalProduct.imageUrl}
                  alt={variantModalProduct.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-neutral-950/80 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs text-neutral-200">
                  {variantModalProduct.portionSizeDescription}
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              {variantModalProduct.variants?.map((variant) => (
                <div
                  key={variant.id}
                  onClick={() => addToCart(variantModalProduct, variant)}
                  className="bg-neutral-950 border border-neutral-800 hover:border-amber-500 p-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                      {variant.name} ({variant.weightOrVolume})
                    </span>
                    {variant.servesDescription && (
                      <p className="text-xs text-neutral-400 flex items-center gap-1">
                        <Users className="w-3 h-3 text-amber-400" />
                        <span>{variant.servesDescription}</span>
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-base font-bold font-mono text-amber-400 tabular-nums">
                      {formatCurrency(variant.price)}
                    </span>
                    <button
                      type="button"
                      className="mt-1 block ml-auto px-2.5 py-1 bg-amber-500 text-neutral-950 text-xs font-bold rounded-lg shadow-sm"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setVariantModalProduct(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Finalizar Venda · {activeTab.label}
                </h3>
                <p className="text-xs text-neutral-400">
                  Aplique desconto se desejar e escolha a forma de pagamento
                </p>
              </div>
              <div className="text-right">
                {discountNum > 0 && (
                  <span className="text-[11px] text-neutral-500 line-through font-mono block">
                    {formatCurrency(cartSubtotal)}
                  </span>
                )}
                <p className="text-lg font-bold font-mono text-amber-400 tabular-nums">
                  {formatCurrency(finalTotal)}
                </p>
              </div>
            </div>

            {/* Quick Discount Bar */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>Desconto (R$):</span>
                </label>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setDiscountInput(Math.min(cartSubtotal, discountNum + 2).toFixed(2).replace('.', ','))
                    }
                    className="px-2 py-1 text-[11px] font-mono bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg"
                  >
                    - R$ 2
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDiscountInput(Math.min(cartSubtotal, discountNum + 5).toFixed(2).replace('.', ','))
                    }
                    className="px-2 py-1 text-[11px] font-mono bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg"
                  >
                    - R$ 5
                  </button>
                  {cartSubtotal % 1 > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setDiscountInput((cartSubtotal - Math.floor(cartSubtotal)).toFixed(2).replace('.', ','))
                      }
                      className="px-2 py-1 text-[11px] font-semibold bg-neutral-800 hover:bg-neutral-700 text-amber-300 rounded-lg"
                    >
                      Arredondar
                    </button>
                  )}
                  {discountNum > 0 && (
                    <button
                      type="button"
                      onClick={() => setDiscountInput('')}
                      className="px-2 py-1 text-[11px] text-neutral-400 hover:text-white underline"
                    >
                      Zerar
                    </button>
                  )}
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-500">
                  R$
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-900 border border-neutral-800 focus:border-amber-500 focus:outline-none rounded-lg text-white font-mono tabular-nums"
                />
              </div>
            </div>

            {/* Split Payment Toggle ("Meio a Meio") */}
            <div className="flex items-center justify-between bg-neutral-950/70 border border-neutral-800 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <Split className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="text-xs font-bold text-white block">
                    Dividir em 2 Formas (Meio a Meio)
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Ex: parte no Pix + parte no Dinheiro ou Fiado
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !isSplitPayment;
                  setIsSplitPayment(next);
                  if (next) {
                    setSplitPrimaryAmountInput((finalTotal / 2).toFixed(2).replace('.', ','));
                  }
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  isSplitPayment
                    ? 'bg-amber-500 text-neutral-950'
                    : 'bg-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                {isSplitPayment ? 'Ativado' : 'Ativar'}
              </button>
            </div>

            {/* Single Payment Selector vs Split Payment Selector */}
            {!isSplitPayment ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('dinheiro')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-colors text-xs font-semibold ${
                    selectedMethod === 'dinheiro'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <span className="text-lg">💵</span>
                  <span>Dinheiro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('pix')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-colors text-xs font-semibold ${
                    selectedMethod === 'pix'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <span className="text-lg">📱</span>
                  <span>Pix</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('cartao_debito')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-colors text-xs font-semibold ${
                    selectedMethod === 'cartao_debito'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <span className="text-lg">💳</span>
                  <span>Cartão</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('fiado')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-colors text-xs font-semibold ${
                    selectedMethod === 'fiado'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-1 ring-rose-500'
                      : 'bg-neutral-950 border-rose-900/40 text-rose-300 hover:bg-rose-950/20'
                  }`}
                >
                  <span className="text-lg">📒</span>
                  <span>FIADO</span>
                </button>
              </div>
            ) : (
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-neutral-300 block">
                      1ª Forma de Pagamento
                    </label>
                    <select
                      value={splitPrimaryMethod}
                      onChange={(e) => setSplitPrimaryMethod(e.target.value as PaymentMethod)}
                      className="w-full px-2.5 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                    >
                      {(['pix', 'dinheiro', 'cartao_debito', 'fiado'] as PaymentMethod[]).map((m) => (
                        <option key={m} value={m}>
                          {PAYMENT_METHOD_LABELS[m]}
                        </option>
                      ))}
                    </select>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-500">
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={splitPrimaryAmountInput}
                        onChange={(e) => setSplitPrimaryAmountInput(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono font-bold tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-neutral-300 block">
                      2ª Forma (Restante Automático)
                    </label>
                    <select
                      value={splitSecondaryMethod}
                      onChange={(e) => setSplitSecondaryMethod(e.target.value as PaymentMethod)}
                      className="w-full px-2.5 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                    >
                      {(['dinheiro', 'pix', 'cartao_debito', 'fiado'] as PaymentMethod[]).map((m) => (
                        <option key={m} value={m}>
                          {PAYMENT_METHOD_LABELS[m]}
                        </option>
                      ))}
                    </select>
                    <div className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-mono font-bold text-amber-400 tabular-nums">
                      {formatCurrency(splitSecondaryAmount)}
                    </div>
                  </div>
                </div>

                {splitInvalid && (
                  <p className="text-[11px] text-rose-400">
                    Informe um valor entre R$ 0,01 e {formatCurrency(finalTotal - 0.01)} na 1ª forma.
                  </p>
                )}
              </div>
            )}

            {/* Cash Change Helper */}
            {hasCashLeg && (
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-300">
                    {isSplitPayment
                      ? `Quanto pagou em dinheiro (para cobrir ${formatCurrency(cashLegAmount)})?`
                      : 'Quanto o cliente pagou em dinheiro?'}
                  </label>
                  {hasCashInput && (
                    <button
                      type="button"
                      onClick={() => setCashGiven('')}
                      className="text-[11px] text-neutral-400 hover:text-white underline"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-mono font-bold">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={`Ex: ${cashLegAmount.toFixed(2).replace('.', ',')} (Valor Exato)`}
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-full pl-11 pr-3 py-2.5 text-lg bg-neutral-900 border border-neutral-700 focus:border-amber-500 focus:outline-none rounded-xl text-white font-mono font-bold tabular-nums placeholder:text-neutral-600 placeholder:text-xs placeholder:font-normal"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCashGiven(cashLegAmount.toFixed(2).replace('.', ','))}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-amber-300 rounded-lg border border-neutral-700 whitespace-nowrap"
                  >
                    Exato ({formatCurrency(cashLegAmount)})
                  </button>
                  {[10, 20, 50, 100, 200].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCashGiven(val.toString())}
                      className="px-2.5 py-1.5 text-xs font-mono font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg border border-neutral-700 whitespace-nowrap"
                    >
                      R$ {val}
                    </button>
                  ))}
                </div>

                {missingCash > 0 ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-rose-950/40 border border-rose-800/70">
                    <div>
                      <span className="text-xs font-bold text-rose-300 block">Valor insuficiente</span>
                      <span className="text-[11px] text-rose-200/70">
                        Valor em dinheiro é {formatCurrency(cashLegAmount)}
                      </span>
                    </div>
                    <span className="text-lg font-bold font-mono tabular-nums text-rose-400">
                      Falta {formatCurrency(missingCash)}
                    </span>
                  </div>
                ) : (
                  <div
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      changeDue > 0
                        ? 'bg-emerald-950/40 border-emerald-700/70'
                        : 'bg-neutral-900 border-neutral-800'
                    }`}
                  >
                    <div>
                      <span
                        className={`text-xs font-bold block ${
                          changeDue > 0 ? 'text-emerald-300' : 'text-neutral-300'
                        }`}
                      >
                        Troco a devolver:
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {!hasCashInput || changeDue === 0
                          ? 'Sem troco (valor exato)'
                          : `Pago ${formatCurrency(cashGivenNumber)} − Parte ${formatCurrency(cashLegAmount)}`}
                      </span>
                    </div>
                    <span
                      className={`text-2xl font-bold font-mono tabular-nums ${
                        changeDue > 0 ? 'text-emerald-400' : 'text-neutral-400'
                      }`}
                    >
                      {formatCurrency(changeDue)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Pix Key Helper */}
            {hasPixLeg && (
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Chave Pix do Estabelecimento:</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-neutral-800 text-amber-400">
                    {settings.pixKeyType}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                  <span className="text-xs font-mono text-white flex-1 truncate">
                    {settings.ownerPixKey || 'Não cadastrada'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs flex items-center gap-1 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                {settings.ownerName && (
                  <p className="text-[11px] text-neutral-500">Favorecido: {settings.ownerName}</p>
                )}
              </div>
            )}

            {/* Fiado Customer Selector */}
            {hasFiadoLeg && (
              <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-rose-300">
                    Selecione o Cliente ({formatCurrency(fiadoLegAmount)} no Fiado):
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsQuickCustomerOpen(true)}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 underline"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    + Cadastrar na hora
                  </button>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Filtrar por nome ou apelido..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                  />

                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value);
                      setOverrideCreditLimit(false);
                    }}
                    className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                  >
                    <option value="">-- Escolha o cliente --</option>
                    {customers
                      .filter(
                        (c) =>
                          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                          (c.nickname && c.nickname.toLowerCase().includes(customerSearch.toLowerCase()))
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.nickname ? `(${c.nickname})` : ''} - Dívida atual:{' '}
                          {formatCurrency(c.totalDebt)}
                        </option>
                      ))}
                  </select>
                </div>

                {selectedCustomer && (
                  <div className="bg-neutral-900/90 p-3 rounded-lg border border-neutral-800 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">WhatsApp:</span>
                      <span className="text-white font-mono">
                        {formatDisplayPhone(selectedCustomer.phone)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Dívida Atual:</span>
                      <span className="text-rose-400 font-mono font-bold">
                        {formatCurrency(selectedCustomer.totalDebt)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-neutral-800">
                      <span className="text-neutral-300 font-semibold">Novo Saldo Devedor:</span>
                      <span className="text-rose-300 font-mono font-bold">
                        {formatCurrency(selectedCustomer.totalDebt + fiadoLegAmount)}
                      </span>
                    </div>

                    {willExceedCredit && (
                      <div className="mt-2 p-2.5 bg-amber-950/50 border border-amber-700/70 rounded-lg space-y-2">
                        <div className="text-[11px] text-amber-300 flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            Atenção: o novo saldo ultrapassa o limite sugerido (
                            {formatCurrency(selectedCustomer.creditLimit || 0)}).
                          </span>
                        </div>
                        <label className="flex items-center gap-2 text-[11px] font-semibold text-white cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={overrideCreditLimit}
                            onChange={(e) => setOverrideCreditLimit(e.target.checked)}
                            className="rounded border-amber-500 text-amber-500 focus:ring-amber-500"
                          />
                          <span>Autorizo passar acima do limite</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">
                Observação da venda (opcional):
              </label>
              <input
                type="text"
                placeholder="Ex: sem cebola, cerveja pra levar..."
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white"
              />
            </div>

            {checkoutError && (
              <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={cannotConfirmSale}
                onClick={handleConfirmSale}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-colors shadow-md ${
                  cannotConfirmSale
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
                }`}
              >
                {hasFiadoLeg && !isSplitPayment
                  ? 'Confirmar e Anotar no Fiado'
                  : 'Confirmar e Registrar Venda'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {isQuickCustomerOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateQuickCustomer}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl"
          >
            <div className="border-b border-neutral-800 pb-2 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                Cadastro Rápido de Cliente
              </h3>
              <button
                type="button"
                onClick={() => setIsQuickCustomerOpen(false)}
                className="text-neutral-500 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-neutral-300 block mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Marcelo Silva"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-300 block mb-1">Apelido / Como é conhecido</label>
                <input
                  type="text"
                  placeholder="Ex: Marcão da Mecânica, Vizinho da Padaria"
                  value={newCustNickname}
                  onChange={(e) => setNewCustNickname(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-300 block mb-1">WhatsApp (DDD + Número) *</label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: 11999998888"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {quickCustError && (
                <p className="text-xs text-rose-400">{quickCustError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsQuickCustomerOpen(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 bg-neutral-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg"
              >
                Salvar e Selecionar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Post-Sale Receipt / WhatsApp Share Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Venda Concluída! {completedSale.tableLabel ? `(${completedSale.tableLabel})` : ''}
                </h3>
                <p className="text-xs text-neutral-400 font-mono">
                  {completedSale.splitPayment
                    ? `Dividido: ${PAYMENT_METHOD_LABELS[completedSale.splitPayment.primaryMethod]} (${formatCurrency(
                        completedSale.splitPayment.primaryAmount
                      )}) + ${PAYMENT_METHOD_LABELS[completedSale.splitPayment.secondaryMethod]} (${formatCurrency(
                        completedSale.splitPayment.secondaryAmount
                      )})`
                    : completedSale.paymentMethod === 'fiado'
                    ? `Anotado no Fiado de ${completedSale.customerName}`
                    : `Recebido via ${completedSale.paymentMethod.toUpperCase()}`}
                </p>
              </div>
            </div>

            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-xs font-mono space-y-1.5">
              {completedSale.discount && completedSale.discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Desconto Aplicado:</span>
                  <span>- {formatCurrency(completedSale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-400">
                <span>Total da Venda:</span>
                <span className="text-amber-400 font-bold">{formatCurrency(completedSale.total)}</span>
              </div>
              {completedSale.cashReceived !== undefined && (
                <>
                  <div className="flex justify-between text-neutral-400">
                    <span>Valor Pago em Dinheiro:</span>
                    <span className="text-white">{formatCurrency(completedSale.cashReceived)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-neutral-800">
                    <span>Troco Devolvido:</span>
                    <span>{formatCurrency(completedSale.changeGiven || 0)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-neutral-500 text-[11px] pt-1 border-t border-neutral-900">
                <span>Itens:</span>
                <span className="text-right">
                  {completedSale.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {completedSale.customerId &&
                (() => {
                  const cust = customers.find((c) => c.id === completedSale.customerId);
                  if (!cust) return null;
                  const cleanPhone = sanitizePhoneForWhatsApp(cust.phone);
                  const msg = buildWhatsAppReceiptMessage(completedSale, settings);
                  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

                  return (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Enviar Comprovante no WhatsApp do Cliente
                    </a>
                  );
                })()}

              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                className="w-full py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl transition-colors"
              >
                Próxima Venda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
