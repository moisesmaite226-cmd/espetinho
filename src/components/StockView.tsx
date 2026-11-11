import React, { useState } from 'react';
import { Product, ProductCategory } from '../types';
import { formatCurrency } from '../utils/formatters';
import { 
  Package, 
  AlertTriangle, 
  Plus, 
  Search, 
  Edit2, 
  TrendingUp, 
  Check, 
  Flame, 
  Beer, 
  UtensilsCrossed,
  X
} from 'lucide-react';

interface StockViewProps {
  products: Product[];
  onSaveProduct: (product: Product) => void;
  onQuickReplenish: (productId: string, quantityToAdd: number) => void;
}

export const StockView: React.FC<StockViewProps> = ({
  products,
  onSaveProduct,
  onQuickReplenish,
}) => {
  const [selectedCat, setSelectedCat] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Form states for create/edit
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('espeto');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('10');
  const [unit, setUnit] = useState('un');
  const [portionSizeDescription, setPortionSizeDescription] = useState('');

  const lowStockProducts = products.filter((p) => p.active && p.stock <= p.minStock);

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCat === 'todos' || p.category === selectedCat;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

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
    setIsNewModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price.replace(',', '.')) || 0;
    const numCost = parseFloat(costPrice.replace(',', '.')) || 0;
    const numStock = parseInt(stock, 10) || 0;
    const numMin = parseInt(minStock, 10) || 5;

    if (!name.trim() || numPrice <= 0) {
      alert('Informe um nome e preço de venda válidos!');
      return;
    }

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
      variants: editingProduct?.variants,
      active: true,
      imageUrl: editingProduct?.imageUrl,
    };

    onSaveProduct(prodToSave);
    setEditingProduct(null);
    setIsNewModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
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
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
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
            onClick={() => setSelectedCat('porcao')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCat === 'porcao'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            🍟 Porções
          </button>
        </div>

        {/* Search & Add */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[180px]">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar no estoque..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white placeholder-neutral-500"
            />
          </div>

          <button
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg whitespace-nowrap shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Produto</span>
          </button>
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
                  <tr key={p.id} className="hover:bg-neutral-800/40 transition-colors">
                    
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
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="font-bold text-white text-xs">{p.name}</div>
                          <span className="text-[10px] text-neutral-500 uppercase">{p.category} · {p.unit}</span>
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
                      <div className="flex items-center justify-end gap-1.5">
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

                    {/* Edit button */}
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800 rounded hover:bg-neutral-700 transition-colors"
                        title="Editar produto"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
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
            className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl"
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
                    Preço de Custo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    placeholder="0,00"
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
                    placeholder="0,00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

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
            </div>

            <div className="flex justify-end gap-2 pt-2">
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
          </form>
        </div>
      )}

    </div>
  );
};
