import React, { useState } from 'react';
import { 
  Product, 
  CartItem, 
  Customer, 
  PaymentMethod, 
  Sale, 
  AppSettings,
  PortionVariant,
  ProductCategory 
} from '../types';
import { 
  formatCurrency, 
  sanitizePhoneForWhatsApp, 
  buildWhatsAppReceiptMessage, 
  formatDisplayPhone 
} from '../utils/formatters';
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
  Info,
  X
} from 'lucide-react';

interface PDVViewProps {
  products: Product[];
  customers: Customer[];
  settings: AppSettings;
  onCompleteSale: (
    sale: Sale, 
    cart: CartItem[], 
    method: PaymentMethod, 
    customerId?: string, 
    notes?: string
  ) => void;
  onQuickAddCustomer: (customerData: { name: string; nickname?: string; phone: string; creditLimit?: number }) => Customer;
}

export const PDVView: React.FC<PDVViewProps> = ({
  products,
  customers,
  settings,
  onCompleteSale,
  onQuickAddCustomer,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Portion Variant Picker Modal
  const [variantModalProduct, setVariantModalProduct] = useState<Product | null>(null);

  // Checkout Modal states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('dinheiro');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [saleNotes, setSaleNotes] = useState('');

  // Quick New Customer Modal
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustNickname, setNewCustNickname] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Post-sale receipt modal
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (!p.active) return false;
    const matchesCat = selectedCategory === 'todos' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Helper to generate unique cart key
  const getCartItemKey = (productId: string, variantId?: string) => {
    return variantId ? `${productId}_${variantId}` : `${productId}_default`;
  };

  // Add to cart with specific portion variant
  const addToCart = (product: Product, variant?: PortionVariant) => {
    const unitPrice = variant ? variant.price : product.price;
    const displayName = variant 
      ? `${product.name} (${variant.name}${variant.weightOrVolume ? ` ${variant.weightOrVolume}` : ''})`
      : product.name;

    const itemKey = getCartItemKey(product.id, variant?.id);

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => getCartItemKey(item.product.id, item.selectedVariant?.id) === itemKey
      );

      if (existingIndex >= 0) {
        return prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...prev,
        {
          product,
          quantity: 1,
          selectedVariant: variant,
          displayName,
          unitPrice,
        },
      ];
    });

    if (variantModalProduct) {
      setVariantModalProduct(null);
    }
  };

  const handleProductCardClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setVariantModalProduct(product);
    } else {
      addToCart(product);
    }
  };

  const updateQuantity = (cartKey: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (getCartItemKey(item.product.id, item.selectedVariant?.id) === cartKey) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (cartKey: string) => {
    setCart((prev) =>
      prev.filter((item) => getCartItemKey(item.product.id, item.selectedVariant?.id) !== cartKey)
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setIsCheckoutOpen(true);
    setCashGiven(cartTotal.toString());
  };

  // Cash change calculation
  const cashGivenNumber = parseFloat(cashGiven.replace(',', '.')) || 0;
  const changeDue = Math.max(0, cashGivenNumber - cartTotal);

  // Selected customer for fiado
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const willExceedCredit = selectedCustomer && selectedCustomer.creditLimit
    ? (selectedCustomer.totalDebt + cartTotal) > selectedCustomer.creditLimit
    : false;

  const handleConfirmSale = () => {
    if (selectedMethod === 'fiado' && !selectedCustomerId) {
      alert('Por favor, selecione o cliente para marcar no fiado!');
      return;
    }

    const saleItems = cart.map((item) => ({
      productId: item.product.id,
      name: item.displayName,
      variantName: item.selectedVariant?.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.unitPrice * item.quantity,
    }));

    const sale: Sale = {
      id: `sale_${Date.now()}`,
      timestamp: new Date().toISOString(),
      items: saleItems,
      total: cartTotal,
      paymentMethod: selectedMethod,
      customerId: selectedMethod === 'fiado' ? selectedCustomerId : undefined,
      customerName: selectedMethod === 'fiado' && selectedCustomer
        ? (selectedCustomer.nickname ? `${selectedCustomer.name} (${selectedCustomer.nickname})` : selectedCustomer.name)
        : undefined,
      notes: saleNotes.trim() || undefined,
    };

    onCompleteSale(sale, cart, selectedMethod, selectedCustomerId, saleNotes);
    setCompletedSale(sale);
    setCart([]);
    setIsCheckoutOpen(false);
    setSelectedCustomerId('');
    setSaleNotes('');
  };

  const handleCreateQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      alert('Preencha pelo menos Nome e WhatsApp!');
      return;
    }
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Left Column: Products Showcase (8 cols) */}
      <div className="lg:col-span-8 space-y-4">
        
        {/* Category Filter and Search Bar */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-sm">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('todos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'todos'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Todos ({products.length})
            </button>
            <button
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
          </div>

          {/* Search Box */}
          <div className="relative min-w-[180px] sm:max-w-xs">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar porção, espeto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filteredProducts.map((product) => {
            const hasVariants = product.variants && product.variants.length > 0;
            const isLowStock = product.stock <= product.minStock;

            // Total quantity of this product in cart (across all variants)
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
                {/* Visual Image with Aspect Ratio and Realism */}
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
                      {product.category === 'outro' && <Layers className="w-10 h-10 text-neutral-500" />}
                    </div>
                  )}

                  {/* Gradient Overlay for Legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent pointer-events-none" />

                  {/* Stock Tag Top Left */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold backdrop-blur-sm ${
                      product.stock <= 0
                        ? 'bg-rose-500/90 text-white'
                        : isLowStock
                        ? 'bg-amber-500 text-neutral-950'
                        : 'bg-neutral-950/80 text-neutral-300 border border-neutral-700/80'
                    }`}>
                      {product.stock <= 0 ? 'Esgotado' : `${product.stock} un`}
                    </span>
                  </div>

                  {/* Portion Size Highlight Badge Top Right */}
                  {product.portionSizeDescription && (
                    <div className="absolute top-2.5 right-2.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-950/85 text-amber-300 border border-amber-500/30 backdrop-blur-sm flex items-center gap-1">
                        <Scale className="w-3 h-3 text-amber-400" />
                        <span>{product.portionSizeDescription.split('·')[0]}</span>
                      </span>
                    </div>
                  )}

                  {/* Total In-Cart Badge */}
                  {inCartQty > 0 && (
                    <div className="absolute bottom-2.5 right-2.5 bg-amber-500 text-neutral-950 font-bold text-xs px-2.5 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                      <span>{inCartQty} no pedido</span>
                    </div>
                  )}
                </div>

                {/* Info Container */}
                <div className="p-3.5 flex flex-col justify-between flex-1 space-y-3">
                  <div>
                    <h3 
                      onClick={() => handleProductCardClick(product)}
                      className="text-sm font-bold text-white hover:text-amber-400 transition-colors cursor-pointer leading-snug line-clamp-2"
                    >
                      {product.name}
                    </h3>

                    {/* Portion description or gramatura */}
                    {product.portionSizeDescription && (
                      <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
                        <span className="text-amber-400/90 font-medium">
                          {product.portionSizeDescription}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Portion Selection Options (If Product Has Variants) */}
                  {hasVariants ? (
                    <div className="space-y-1.5 pt-1 border-t border-neutral-800/80">
                      <span className="text-[10px] font-semibold uppercase text-neutral-400 tracking-wider flex items-center gap-1">
                        <Scale className="w-3 h-3 text-amber-400" />
                        Escolha o Tamanho da Porção:
                      </span>
                      
                      <div className="grid grid-cols-2 gap-1.5">
                        {product.variants!.map((variant) => {
                          const variantCartKey = getCartItemKey(product.id, variant.id);
                          const variantInCart = cart.find(
                            (c) => getCartItemKey(c.product.id, c.selectedVariant?.id) === variantCartKey
                          );

                          return (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => addToCart(product, variant)}
                              className={`p-2 rounded-xl border text-left transition-all active:scale-[0.98] ${
                                variantInCart
                                  ? 'bg-amber-500/20 border-amber-500/80 text-amber-300'
                                  : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs truncate">{variant.name}</span>
                                {variantInCart && (
                                  <span className="text-[10px] font-bold bg-amber-500 text-neutral-950 px-1.5 rounded-full">
                                    {variantInCart.quantity}
                                  </span>
                                )}
                              </div>

                              <div className="text-[10px] text-neutral-400 truncate">
                                {variant.weightOrVolume} {variant.servesDescription ? `· ${variant.servesDescription}` : ''}
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
                    /* Single Price and Direct Add Button for Non-Variant Items */
                    <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-neutral-500 uppercase block text-[10px] font-medium">Preço</span>
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

      {/* Right Column: Interactive Cart & Fast Checkout (4 cols) */}
      <div className="lg:col-span-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sticky top-20 flex flex-col min-h-[500px] shadow-xl">
          
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Comanda Balcão</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-amber-400 font-semibold">
                {cartItemCount} itens
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-neutral-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 max-h-[420px] scrollbar-thin">
            {cart.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center text-center text-neutral-500">
                <UtensilsCrossed className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs font-medium">Nenhum item na comanda.</p>
                <p className="text-[11px] text-neutral-600 mt-1 max-w-[200px]">
                  Clique nas porções, espetos ou bebidas para adicionar.
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
                        <p className="text-xs font-bold text-white truncate">
                          {item.product.name}
                        </p>
                        {item.selectedVariant ? (
                          <div className="flex items-center gap-1 text-[11px] text-amber-400">
                            <Scale className="w-3 h-3" />
                            <span>{item.selectedVariant.name} ({item.selectedVariant.weightOrVolume})</span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-neutral-500">
                            {item.product.portionSizeDescription || item.product.unit}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => removeFromCart(cartKey)}
                        className="text-neutral-500 hover:text-rose-400 p-1 transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-neutral-900">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 shrink-0 bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                        <button
                          onClick={() => updateQuantity(cartKey, -1)}
                          className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-mono font-bold text-white tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(cartKey, 1)}
                          className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal */}
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
          </div>

          {/* Cart Footer */}
          <div className="border-t border-neutral-800 pt-3 mt-auto space-y-3">
            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-xs font-medium">Total da Venda</span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tabular-nums">
                {formatCurrency(cartTotal)}
              </span>
            </div>

            {/* Main Action: Cobrar / Fechar Venda */}
            <button
              disabled={cart.length === 0}
              onClick={handleOpenCheckout}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                cart.length > 0
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 shadow-lg shadow-orange-500/20 active:scale-[0.99] cursor-pointer'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
            >
              <span>Fechar Comanda ({cartItemCount} itens)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Portion Detail / Variant Modal */}
      {variantModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <UtensilsCrossed className="w-4 h-4 text-amber-400" />
                  <span>Escolha o Tamanho da Porção</span>
                </h3>
                <p className="text-xs text-neutral-400">{variantModalProduct.name}</p>
              </div>
              <button
                onClick={() => setVariantModalProduct(null)}
                className="text-neutral-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo preview in modal */}
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

            {/* Variants options list */}
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Finalizar Venda</h3>
                <p className="text-xs text-neutral-400">Escolha a forma de pagamento do cliente</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-neutral-400">Total:</span>
                <p className="text-lg font-bold font-mono text-amber-400 tabular-nums">
                  {formatCurrency(cartTotal)}
                </p>
              </div>
            </div>

            {/* Payment Method Selector */}
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

              {/* FIADO BUTTON */}
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

            {/* Contextual Options per Payment Method */}
            {selectedMethod === 'dinheiro' && (
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-3">
                <label className="text-xs font-medium text-neutral-300 block">
                  Valor recebido em dinheiro:
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-mono">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.50"
                      value={cashGiven}
                      onChange={(e) => setCashGiven(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    {[20, 50, 100].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCashGiven(val.toString())}
                        className="px-2.5 py-1 text-xs font-mono bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700"
                      >
                        R${val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                  <span className="text-xs text-neutral-400">Troco a devolver:</span>
                  <span className={`text-base font-bold font-mono tabular-nums ${
                    changeDue > 0 ? 'text-emerald-400' : 'text-neutral-500'
                  }`}>
                    {formatCurrency(changeDue)}
                  </span>
                </div>
              </div>
            )}

            {selectedMethod === 'pix' && (
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
                  <p className="text-[11px] text-neutral-500">
                    Favorecido: {settings.ownerName}
                  </p>
                )}
              </div>
            )}

            {selectedMethod === 'fiado' && (
              <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-rose-300">
                    Selecione o Cliente da Caderneta:
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
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                  >
                    <option value="">-- Escolha o cliente --</option>
                    {customers
                      .filter((c) => 
                        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                        (c.nickname && c.nickname.toLowerCase().includes(customerSearch.toLowerCase()))
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.nickname ? `(${c.nickname})` : ''} - Dívida atual: {formatCurrency(c.totalDebt)}
                        </option>
                      ))}
                  </select>
                </div>

                {selectedCustomer && (
                  <div className="bg-neutral-900/90 p-3 rounded-lg border border-neutral-800 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">WhatsApp:</span>
                      <span className="text-white font-mono">{formatDisplayPhone(selectedCustomer.phone)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Dívida Atual:</span>
                      <span className="text-rose-400 font-mono font-bold">{formatCurrency(selectedCustomer.totalDebt)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-neutral-800">
                      <span className="text-neutral-300 font-semibold">Novo Saldo Devedor:</span>
                      <span className="text-rose-300 font-mono font-bold">
                        {formatCurrency(selectedCustomer.totalDebt + cartTotal)}
                      </span>
                    </div>

                    {willExceedCredit && (
                      <div className="mt-2 p-2 bg-amber-950/40 border border-amber-800/60 rounded text-[11px] text-amber-300 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Atenção: essa compra ultrapassa o limite de crédito sugerido ({formatCurrency(selectedCustomer.creditLimit || 0)}).</span>
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
                onClick={handleConfirmSale}
                className="px-5 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl transition-colors shadow-md"
              >
                {selectedMethod === 'fiado' ? 'Confirmar e Anotar no Fiado' : 'Confirmar e Registrar Venda'}
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
                <h3 className="text-base font-bold text-white">Venda Concluída!</h3>
                <p className="text-xs text-neutral-400 font-mono">
                  {completedSale.paymentMethod === 'fiado' 
                    ? `Anotado no Fiado de ${completedSale.customerName}`
                    : `Recebido via ${completedSale.paymentMethod.toUpperCase()}`
                  }
                </p>
              </div>
            </div>

            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-xs font-mono space-y-1">
              <div className="flex justify-between text-neutral-400">
                <span>Total da Venda:</span>
                <span className="text-amber-400 font-bold">{formatCurrency(completedSale.total)}</span>
              </div>
              <div className="flex justify-between text-neutral-500 text-[11px]">
                <span>Itens:</span>
                <span>{completedSale.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {completedSale.customerId && (
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
                })()
              )}

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
