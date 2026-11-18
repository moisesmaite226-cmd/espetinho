import React, { useState, useMemo } from 'react';
import { Product, ProductCategory, Sale, PortionVariant } from '../types';
import { formatCurrency } from '../utils/formatters';
import { AVAILABLE_PRODUCT_IMAGES } from '../data/initialData';
import { 
  matchesProductFilterTab, 
  buildSalesCountMap, 
  sortProducts, 
  ProductSortMode 
} from '../utils/productHelpers';
import { 
  Package, 
  AlertTriangle, 
  Plus, 
  Search, 
  Edit2, 
  TrendingUp, 
  ArrowUpDown,
  Check, 
  Flame, 
  Beer, 
  UtensilsCrossed,
  Droplets,
  Trash2,
  Image as ImageIcon,
  Eye,
  EyeOff,
  X,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';

interface StockViewProps {
  products: Product[];
  sales?: Sale[];
  onSaveProduct: (product: Product) => void;
  onQuickReplenish: (productId: string, quantityToAdd: number) => void;
  onToggleProductActive?: (productId: string) => void;
  onDeleteProduct?: (productId: string) => void;
  onOpenCombosManager?: () => void;
  onOpenSmartRestock?: () => void;
}

export const StockView: React.FC<StockViewProps> = ({
  products,
  sales = [],
  onSaveProduct,
  onQuickReplenish,
  onToggleProductActive,
  onDeleteProduct,
  onOpenCombosManager,
  onOpenSmartRestock,
}) => {
  const [selectedCat, setSelectedCat] = useState<string>('todos');
  const [visibilityFilter, setVisibilityFilter] = useState<'todos' | 'ativos' | 'esgotados' | 'ocultos'>('todos');
  const [sortMode, setSortMode] = useState<ProductSortMode>('mais_vendidos');
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteInModal, setConfirmDeleteInModal] = useState(false);

  // Form states for create/edit
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('espeto');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('10');
  const [unit, setUnit] = useState('un');
  const [portionSizeDescription, setPortionSizeDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [variants, setVariants] = useState<PortionVariant[]>([]);
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState('');

  const outOfStockProducts = products.filter((p) => p.active && p.stock <= 0);
  const lowStockProducts = products.filter((p) => p.active && p.stock > 0 && p.stock <= p.minStock);
  const hiddenCount = products.filter((p) => !p.active).length;

  const salesCountMap = useMemo(() => buildSalesCountMap(sales), [sales]);

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((p) => {
      const matchesCat = matchesProductFilterTab(p, selectedCat);
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesVisibility =
        visibilityFilter === 'todos'
          ? true
          : visibilityFilter === 'ativos'
          ? p.active && p.stock > 0
          : visibilityFilter === 'esgotados'
          ? p.active && p.stock <= 0
          : !p.active;
      return matchesCat && matchesSearch && matchesVisibility;
    });
    return sortProducts(filtered, sortMode, salesCountMap);
  }, [products, selectedCat, visibilityFilter, search, sortMode, salesCountMap]);

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category);
    setPrice(p.price.toString());
    setCostPrice(p.costPrice.toString());
    setStock(p.stock.toString());
    setMinStock(p.minStock.toString());
    setUnit(p.unit);
    setPortionSizeDescription(p.portionSizeDescription || '');
    setImageUrl(p.imageUrl || '');
    setVariants(p.variants ? p.variants.map((v) => ({ ...v })) : []);
    setActive(p.active);
    setConfirmDeleteInModal(false);
    setFormError('');
  };

  const handleOpenNew = () => {
    setEditingProduct(null);
    setName('');
    setCategory('porcao');
    setPrice('');
    setCostPrice('');
    setStock('20');
    setMinStock('10');
    setUnit('porção');
    setPortionSizeDescription('Inteira ~600g ou Meia ~300g');
    setImageUrl(AVAILABLE_PRODUCT_IMAGES[0]?.url || '');
    setVariants([]);
    setActive(true);
    setConfirmDeleteInModal(false);
    setFormError('');
    setIsNewModalOpen(true);
  };

  const handleAddVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: `var_${Date.now()}_${prev.length}`,
        name: 'Novo Tamanho',
        weightOrVolume: '',
        servesDescription: '',
        price: parseFloat(price.replace(',', '.')) || 0,
        costPrice: parseFloat(costPrice.replace(',', '.')) || 0,
      },
    ]);
  };

  const handleUpdateVariantField = (idx: number, field: keyof PortionVariant, value: string | number) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v))
    );
  };

  const handleRemoveVariantRow = (idx: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price.replace(',', '.')) || 0;
    const numCost = parseFloat(costPrice.replace(',', '.')) || 0;
    const numStock = parseInt(stock, 10) || 0;
    const numMin = parseInt(minStock, 10) || 5;

    if (!name.trim() || numPrice <= 0) {
      setFormError('Informe um nome e preço de venda válidos!');
      return;
    }

    const cleanedVariants = variants
      .filter((v) => v.name.trim().length > 0 && v.price > 0)
      .map((v) => ({
        ...v,
        name: v.name.trim(),
        weightOrVolume: v.weightOrVolume?.trim() || undefined,
      }));

    const prodToSave: Product = {
      id: editingProduct ? editingProduct.id : `prod_${Date.now()}`,
      name: name.trim(),
      category,
      price: numPrice,
      costPrice: numCost,
      stock: numStock,
      minStock: numMin,
      unit: unit || 'un',
      portionSizeDescription: portionSizeDescription.trim() || undefined,
      variants: cleanedVariants.length > 0 ? cleanedVariants : undefined,
      active,
      imageUrl: imageUrl.trim() || editingProduct?.imageUrl,
    };

    onSaveProduct(prodToSave);
    setEditingProduct(null);
    setIsNewModalOpen(false);
    setFormError('');
  };

  return (
    <div className="space-y-6">
      
      {/* Alert banner if items sold out and auto-disappeared from PDV */}
      {outOfStockProducts.length > 0 && (
        <div className="bg-rose-950/35 border border-rose-800/80 rounded-xl p-4 space-y-2.5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <span className="font-bold text-rose-300 block mb-0.5">
                {outOfStockProducts.length}{' '}
                {outOfStockProducts.length === 1
                  ? 'item esgotado saiu automaticamente do cardápio'
                  : 'itens esgotados saíram automaticamente do cardápio'}
              </span>
              <p className="text-rose-200/80">
                Assim que você repor o estoque abaixo (+1, +6 ou +12), o item volta automaticamente para o PDV.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pl-8">
            {outOfStockProducts.slice(0, 6).map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-1.5 bg-neutral-950/80 border border-rose-500/30 rounded-lg px-2.5 py-1 text-xs"
              >
                <span className="font-semibold text-white">{p.name}</span>
                <button
                  type="button"
                  onClick={() => onQuickReplenish(p.id, 6)}
                  className="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold"
                  title="Repor 6 e voltar ao cardápio"
                >
                  +6
                </button>
                <button
                  type="button"
                  onClick={() => onQuickReplenish(p.id, 12)}
                  className="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold"
                  title="Repor 12 e voltar ao cardápio"
                >
                  +12
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert banner if items are low on stock */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <span className="font-bold text-amber-300 block mb-0.5">
              Atenção: {lowStockProducts.length} {lowStockProducts.length === 1 ? 'produto está' : 'produtos estão'} com estoque baixo!
            </span>
            <p className="text-amber-200/80">
              {lowStockProducts.map((p) => `${p.name} (${p.stock} ${p.unit})`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Control Strip */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Unified Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedCat('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCat === 'todos'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => setSelectedCat('espeto')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCat === 'espeto'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              🍢 Espetos
            </button>
            <button
              onClick={() => setSelectedCat('porcao')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCat === 'porcao'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              🍟 Porções
            </button>
            <button
              onClick={() => setSelectedCat('bebida')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCat === 'bebida'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              🍺 Bebidas
            </button>
            <button
              onClick={() => setSelectedCat('molho')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCat === 'molho'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              🥫 Molhos
            </button>
          </div>

          {/* Search, Smart Tools & Add */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[170px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar no estoque..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white placeholder-neutral-500"
              />
            </div>

            {onOpenSmartRestock && (
              <button
                type="button"
                onClick={onOpenSmartRestock}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 rounded-lg whitespace-nowrap"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Lista de Compras</span>
              </button>
            )}

            {onOpenCombosManager && (
              <button
                type="button"
                onClick={onOpenCombosManager}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 rounded-lg whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Combos</span>
              </button>
            )}

            <button
              onClick={handleOpenNew}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg whitespace-nowrap shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Novo Produto</span>
            </button>
          </div>
        </div>

        {/* Visibility Filter & Sort Mode Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-neutral-400">
              Exibindo <strong className="text-neutral-200 font-mono">{filteredProducts.length}</strong> itens
            </span>
            <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
              <button
                type="button"
                onClick={() => setVisibilityFilter('todos')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  visibilityFilter === 'todos' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setVisibilityFilter('ativos')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  visibilityFilter === 'ativos' ? 'bg-emerald-500/20 text-emerald-300' : 'text-neutral-400 hover:text-white'
                }`}
              >
                No Cardápio
              </button>
              <button
                type="button"
                onClick={() => setVisibilityFilter('esgotados')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  visibilityFilter === 'esgotados' ? 'bg-rose-500/25 text-rose-200' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Esgotados{outOfStockProducts.length > 0 ? ` (${outOfStockProducts.length})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setVisibilityFilter('ocultos')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  visibilityFilter === 'ocultos' ? 'bg-neutral-800 text-amber-300' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Pausados{hiddenCount > 0 ? ` (${hiddenCount})` : ''}
              </button>
            </div>
          </div>

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

      {/* Products Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Foto & Item</th>
                <th className="px-4 py-3">Tamanho / Porção</th>
                <th className="px-4 py-3">Preço Custo</th>
                <th className="px-4 py-3">Preço Venda</th>
                <th className="px-4 py-3">Margem Bruta</th>
                <th className="px-4 py-3">Estoque Atual</th>
                <th className="px-4 py-3 text-right">Reposição Rápida</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {filteredProducts.map((p) => {
                const isLow = p.stock <= p.minStock;
                const margin = p.price > 0 ? ((p.price - p.costPrice) / p.price) * 100 : 0;

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-neutral-800/40 transition-colors ${
                      !p.active ? 'opacity-65 bg-neutral-950/50' : ''
                    }`}
                  >
                    
                    {/* Photo & Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-neutral-800 overflow-hidden shrink-0 border border-neutral-700/60 relative">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-500">
                              {p.category === 'espeto' && <Flame className="w-5 h-5 text-orange-400/60" />}
                              {p.category === 'bebida' && <Beer className="w-5 h-5 text-amber-400/60" />}
                              {p.category === 'porcao' && <UtensilsCrossed className="w-5 h-5 text-amber-500/60" />}
                              {p.category === 'molho' && <Droplets className="w-5 h-5 text-emerald-400/60" />}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="font-bold text-white text-xs">{p.name}</div>
                          <div className="text-[10px] text-neutral-500 uppercase flex flex-wrap items-center gap-1.5">
                            <span>{p.category} · {p.unit}</span>
                            {!p.active ? (
                              <span className="text-amber-400 font-bold normal-case">· Pausado manualmente</span>
                            ) : p.stock <= 0 ? (
                              <span className="text-rose-400 font-bold normal-case">· Oculto auto (0 un)</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Portion Size / Gramatura */}
                    <td className="px-4 py-3">
                      {p.variants && p.variants.length > 0 ? (
                        <div className="space-y-1">
                          {p.variants.map((v) => (
                            <div key={v.id} className="text-[11px] text-neutral-300 flex items-center gap-1.5">
                              <span className="font-semibold text-amber-300">{v.name}</span>
                              <span className="text-neutral-500">({v.weightOrVolume})</span>
                              <span className="text-neutral-400 font-mono">· {formatCurrency(v.price)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-300 font-medium">
                          {p.portionSizeDescription || `${p.unit}`}
                        </span>
                      )}
                    </td>

                    {/* Cost */}
                    <td className="px-4 py-3 font-mono text-neutral-400 tabular-nums">
                      {formatCurrency(p.costPrice)}
                    </td>

                    {/* Sell Price */}
                    <td className="px-4 py-3 font-mono font-bold text-amber-400 tabular-nums">
                      {formatCurrency(p.price)}
                    </td>

                    {/* Margin */}
                    <td className="px-4 py-3 font-mono tabular-nums">
                      <span className="text-emerald-400 font-semibold">
                        {margin.toFixed(0)}%
                      </span>
                      <span className="text-[10px] text-neutral-500 ml-1">
                        (+{formatCurrency(p.price - p.costPrice)})
                      </span>
                    </td>

                    {/* Stock status */}
                    <td className="px-4 py-3 font-mono tabular-nums">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          p.stock <= 0
                            ? 'bg-rose-500 text-white'
                            : isLow
                            ? 'bg-amber-500 text-neutral-950'
                            : 'bg-neutral-800 text-neutral-200'
                        }`}>
                          {p.stock} {p.unit}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          (mín: {p.minStock})
                        </span>
                      </div>
                    </td>

                    {/* Quick Replenishment Buttons */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onQuickReplenish(p.id, 1)}
                          className="px-2 py-1 bg-neutral-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-neutral-200 rounded font-mono text-[11px] font-semibold transition-colors"
                          title="Adicionar 1 unidade"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => onQuickReplenish(p.id, 6)}
                          className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded font-mono text-[11px] font-semibold"
                          title="Adicionar 6 unidades"
                        >
                          +6
                        </button>
                        <button
                          type="button"
                          onClick={() => onQuickReplenish(p.id, 12)}
                          className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded font-mono text-[11px] font-semibold"
                          title="Adicionar 12 unidades (caixa fechada)"
                        >
                          +12
                        </button>
                        <button
                          type="button"
                          onClick={() => onQuickReplenish(p.id, 24)}
                          className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded font-mono text-[11px] font-semibold"
                          title="Adicionar 24 unidades (fardo)"
                        >
                          +24
                        </button>
                      </div>
                    </td>

                    {/* Actions: Toggle Cardápio / Edit / Delete */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onToggleProductActive && (
                          <button
                            type="button"
                            onClick={() => onToggleProductActive(p.id)}
                            className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors whitespace-nowrap ${
                              p.active
                                ? 'bg-neutral-800 hover:bg-amber-500/20 text-neutral-300 hover:text-amber-300'
                                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                            }`}
                            title={p.active ? 'Tirar do cardápio do PDV' : 'Voltar item para o cardápio'}
                          >
                            {p.active ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span className="hidden xl:inline">Ocultar</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>Reativar</span>
                              </>
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800 rounded hover:bg-neutral-700 transition-colors"
                          title="Editar produto"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {onDeleteProduct && (
                          confirmDeleteId === p.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteProduct(p.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold whitespace-nowrap"
                              >
                                Excluir?
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="p-1 rounded bg-neutral-800 text-neutral-400 hover:text-white"
                                title="Cancelar exclusão"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(p.id)}
                              className="p-1.5 text-neutral-500 hover:text-rose-400 bg-neutral-800 rounded hover:bg-rose-950/40 transition-colors"
                              title="Excluir produto definitivamente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Product Modal */}
      {(isNewModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleSave}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <span>{editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setIsNewModalOpen(false);
                }}
                className="text-neutral-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Nome do Item *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Espeto de Picanha Especial"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Categoria *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white"
                  >
                    <option value="espeto">🍢 Espetinho</option>
                    <option value="bebida">🍺 Bebida</option>
                    <option value="porcao">🍟 Porção</option>
                    <option value="molho">🥫 Molho</option>
                    <option value="outro">🍬 Outro</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Unidade de Medida
                  </label>
                  <input
                    type="text"
                    placeholder="ex: espeto, lata, porção"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Custo p/ Fazer (insumos, gás, carvão)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    placeholder="Ex: 6,00"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    placeholder="Ex: 10,00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              {(parseFloat(price.replace(',', '.')) || 0) > 0 && (
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">Lucro líquido por unidade (seu ganho):</span>
                  <span className="font-mono font-bold text-emerald-400 tabular-nums">
                    {formatCurrency(
                      Math.max(
                        0,
                        (parseFloat(price.replace(',', '.')) || 0) -
                          (parseFloat(costPrice.replace(',', '.')) || 0)
                      )
                    )}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Estoque Atual
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Estoque Mínimo de Alerta
                  </label>
                  <input
                    type="number"
                    placeholder="10"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Tamanho da Porção / Peso / Gramatura
                </label>
                <input
                  type="text"
                  placeholder="Ex: Inteira ~600g (serve até 4) ou Meia ~300g"
                  value={portionSizeDescription}
                  onChange={(e) => setPortionSizeDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white"
                />
                <span className="text-[10px] text-neutral-500">
                  Aparece em destaque nos cards do PDV para ajudar na escolha do cliente.
                </span>
              </div>

              {/* Variants / Sizes Editor */}
              <div className="pt-2 border-t border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-300">
                    Tamanhos / Volumes (Meia, Inteira, 600ml...)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Adicionar tamanho
                  </button>
                </div>

                {variants.length > 0 && (
                  <div className="space-y-2">
                    {variants.map((v, idx) => (
                      <div key={v.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                          <label className="text-[10px] text-neutral-500 block">Nome</label>
                          <input
                            type="text"
                            value={v.name}
                            onChange={(e) => handleUpdateVariantField(idx, 'name', e.target.value)}
                            className="w-full px-2 py-1 text-xs bg-neutral-900 border border-neutral-700 rounded text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] text-neutral-500 block">Peso/Vol</label>
                          <input
                            type="text"
                            placeholder="350ml"
                            value={v.weightOrVolume || ''}
                            onChange={(e) => handleUpdateVariantField(idx, 'weightOrVolume', e.target.value)}
                            className="w-full px-2 py-1 text-xs bg-neutral-900 border border-neutral-700 rounded text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] text-neutral-500 block">Custo</label>
                          <input
                            type="number"
                            step="0.10"
                            value={v.costPrice}
                            onChange={(e) => handleUpdateVariantField(idx, 'costPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-xs font-mono bg-neutral-900 border border-neutral-700 rounded text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] text-neutral-500 block">Venda</label>
                          <input
                            type="number"
                            step="0.50"
                            value={v.price}
                            onChange={(e) => handleUpdateVariantField(idx, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-xs font-mono bg-neutral-900 border border-neutral-700 rounded text-amber-400"
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveVariantRow(idx)}
                            className="p-1 text-neutral-500 hover:text-rose-400"
                            title="Remover tamanho"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Photo Selector */}
              <div className="pt-2 border-t border-neutral-800 space-y-2">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Foto do Produto</span>
                </label>
                <div className="grid grid-cols-6 gap-1.5 max-h-32 overflow-y-auto p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
                  {AVAILABLE_PRODUCT_IMAGES.map((img) => (
                    <button
                      key={img.url}
                      type="button"
                      onClick={() => setImageUrl(img.url)}
                      title={img.label}
                      className={`h-11 rounded-lg overflow-hidden border-2 transition-all ${
                        imageUrl === img.url ? 'border-amber-400 scale-95' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="/images/... ou URL da foto"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-1.5 text-[11px] font-mono bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-300"
                />
              </div>
              {/* Visibility Toggle in Modal */}
              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-neutral-200 block">
                    Exibir no Cardápio (PDV)
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    Desmarque para tirar do cardápio sem apagar o histórico de vendas.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActive((v) => !v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{active ? 'No Cardápio' : 'Fora do Cardápio'}</span>
                </button>
              </div>
            </div>

            {formError && (
              <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {editingProduct && onDeleteProduct ? (
                confirmDeleteInModal ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteProduct(editingProduct.id);
                        setEditingProduct(null);
                        setConfirmDeleteInModal(false);
                      }}
                      className="px-3 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl"
                    >
                      Confirmar Exclusão
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteInModal(false)}
                      className="px-2.5 py-2 text-xs text-neutral-400 bg-neutral-800 rounded-xl"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteInModal(true)}
                    className="px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/30 border border-rose-900/50 rounded-xl flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Item</span>
                  </button>
                )
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsNewModalOpen(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl shadow-md"
                >
                  Salvar Produto
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
