import React, { useState, useMemo } from 'react';
import { ComboOffer, Product } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';

interface CombosManagerModalProps {
  combos: ComboOffer[];
  products: Product[];
  onSaveCombos: (combos: ComboOffer[]) => void;
  onClose: () => void;
}

interface DraftComboItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export const CombosManagerModal: React.FC<CombosManagerModalProps> = ({
  combos,
  products,
  onSaveCombos,
  onClose,
}) => {
  const [editingComboId, setEditingComboId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Editor form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [badge, setBadge] = useState('');
  const [promoPrice, setPromoPrice] = useState('');
  const [items, setItems] = useState<DraftComboItem[]>([]);
  const [formError, setFormError] = useState('');

  const activeProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [products]
  );

  const openNewForm = () => {
    const firstProd = activeProducts[0];
    setEditingComboId(null);
    setIsCreating(true);
    setName('');
    setDescription('');
    setBadge('');
    setPromoPrice('');
    setItems(
      firstProd
        ? [
            {
              productId: firstProd.id,
              variantId: firstProd.variants?.[0]?.id,
              quantity: 1,
            },
          ]
        : []
    );
    setFormError('');
  };

  const openEditForm = (combo: ComboOffer) => {
    setIsCreating(false);
    setEditingComboId(combo.id);
    setName(combo.name);
    setDescription(combo.description);
    setBadge(combo.badge);
    setPromoPrice(combo.promoPrice.toFixed(2).replace('.', ','));
    setItems(combo.items.map((i) => ({ ...i })));
    setFormError('');
  };

  const cancelForm = () => {
    setIsCreating(false);
    setEditingComboId(null);
    setFormError('');
  };

  const editorTotals = useMemo(() => {
    let regularSum = 0;
    let costSum = 0;
    for (const entry of items) {
      const prod = products.find((p) => p.id === entry.productId);
      if (!prod) continue;
      const variant = entry.variantId
        ? prod.variants?.find((v) => v.id === entry.variantId)
        : undefined;
      const unitPrice = variant ? variant.price : prod.price;
      const unitCost = variant ? variant.costPrice : prod.costPrice;
      regularSum += unitPrice * entry.quantity;
      costSum += unitCost * entry.quantity;
    }
    const parsedPromo = parseFloat(promoPrice.replace(',', '.')) || 0;
    const savings = Math.max(0, regularSum - parsedPromo);
    const estProfit = parsedPromo - costSum;
    return { regularSum, costSum, parsedPromo, savings, estProfit };
  }, [items, products, promoPrice]);

  const handleAddItemRow = () => {
    const fallbackProd = activeProducts[0];
    if (!fallbackProd) return;
    setItems((prev) => [
      ...prev,
      {
        productId: fallbackProd.id,
        variantId: fallbackProd.variants?.[0]?.id,
        quantity: 1,
      },
    ]);
  };

  const handleItemProductChange = (idx: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    setItems((prev) =>
      prev.map((row, i) =>
        i === idx
          ? {
              productId,
              variantId: prod?.variants?.[0]?.id,
              quantity: row.quantity,
            }
          : row
      )
    );
  };

  const handleSaveCombo = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPromo = parseFloat(promoPrice.replace(',', '.')) || 0;
    if (!name.trim()) {
      setFormError('Dê um nome para o combo.');
      return;
    }
    if (items.length === 0) {
      setFormError('Adicione pelo menos 1 produto ao combo.');
      return;
    }
    if (parsedPromo <= 0) {
      setFormError('Informe um preço promocional válido.');
      return;
    }

    const autoDescription =
      description.trim() ||
      items
        .map((entry) => {
          const p = products.find((prod) => prod.id === entry.productId);
          if (!p) return '';
          const v = entry.variantId ? p.variants?.find((vr) => vr.id === entry.variantId) : undefined;
          return `${entry.quantity}x ${p.name}${v ? ` (${v.name})` : ''}`;
        })
        .filter(Boolean)
        .join(' + ');

    const autoBadge =
      badge.trim() ||
      (editorTotals.savings > 0.01
        ? `Economia ${formatCurrency(editorTotals.savings)}`
        : 'Combo Especial');

    const newCombo: ComboOffer = {
      id: editingComboId || `combo_${Date.now()}`,
      name: name.trim(),
      description: autoDescription,
      badge: autoBadge,
      promoPrice: Number(parsedPromo.toFixed(2)),
      active: true,
      items: items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId || undefined,
        quantity: Math.max(1, i.quantity),
      })),
    };

    if (editingComboId) {
      const existing = combos.find((c) => c.id === editingComboId);
      newCombo.active = existing?.active ?? true;
      onSaveCombos(combos.map((c) => (c.id === editingComboId ? newCombo : c)));
    } else {
      onSaveCombos([newCombo, ...combos]);
    }

    cancelForm();
  };

  const toggleComboActive = (comboId: string) => {
    onSaveCombos(
      combos.map((c) =>
        c.id === comboId ? { ...c, active: c.active === false ? true : false } : c
      )
    );
  };

  const deleteCombo = (comboId: string) => {
    onSaveCombos(combos.filter((c) => c.id !== comboId));
    setConfirmDeleteId(null);
  };

  const showingForm = isCreating || editingComboId !== null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Gerenciar Combos (1 Toque)</h3>
              <p className="text-xs text-neutral-400">
                Crie promoções personalizadas que aparecem direto no PDV
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!showingForm ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">
                {combos.filter((c) => c.active !== false).length} ativo(s) de {combos.length} cadastrado(s)
              </span>
              <button
                type="button"
                onClick={openNewForm}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Novo Combo</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {combos.length === 0 ? (
                <div className="p-8 text-center bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-500">
                  Nenhum combo cadastrado ainda. Clique em "Criar Novo Combo" para começar.
                </div>
              ) : (
                combos.map((combo) => {
                  const isActive = combo.active !== false;
                  return (
                    <div
                      key={combo.id}
                      className={`bg-neutral-950 border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isActive ? 'border-neutral-800' : 'border-neutral-800/60 opacity-60'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-white">{combo.name}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            {combo.badge}
                          </span>
                          {!isActive && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                              Pausado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400">{combo.description}</p>
                        <div className="text-xs font-mono font-bold text-amber-400 tabular-nums">
                          Preço Combo: {formatCurrency(combo.promoPrice)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleComboActive(combo.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                            isActive
                              ? 'bg-neutral-800 text-neutral-300 hover:text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{isActive ? 'Pausar' : 'Ativar'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditForm(combo)}
                          className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg"
                          title="Editar combo"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {confirmDeleteId === combo.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => deleteCombo(combo.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold"
                            >
                              Excluir
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 text-xs"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(combo.id)}
                            className="p-2 bg-neutral-800 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 rounded-lg"
                            title="Excluir combo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleSaveCombo} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Nome do Combo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Combo Churras + Brahma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Etiqueta / Destaque (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mais Pedido! ou Economia R$ 4"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white"
                />
              </div>
            </div>

            {/* Items builder */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400">Itens que entram no Combo</span>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-semibold rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Item
                </button>
              </div>

              <div className="space-y-2">
                {items.map((entry, idx) => {
                  const selectedProd = products.find((p) => p.id === entry.productId);
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-neutral-900 p-2 rounded-lg border border-neutral-800"
                    >
                      <div className="sm:col-span-6">
                        <select
                          value={entry.productId}
                          onChange={(e) => handleItemProductChange(idx, e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-neutral-950 border border-neutral-700 rounded text-white"
                        >
                          {activeProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({formatCurrency(p.price)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        {selectedProd?.variants && selectedProd.variants.length > 0 ? (
                          <select
                            value={entry.variantId || selectedProd.variants[0].id}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((row, i) =>
                                  i === idx ? { ...row, variantId: e.target.value } : row
                                )
                              )
                            }
                            className="w-full px-2 py-1.5 text-xs bg-neutral-950 border border-neutral-700 rounded text-white"
                          >
                            {selectedProd.variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name} ({formatCurrency(v.price)})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[11px] text-neutral-500 px-2 block">
                            Tamanho único
                          </span>
                        )}
                      </div>

                      <div className="sm:col-span-2 flex items-center gap-1">
                        <span className="text-[11px] text-neutral-400">Qtd:</span>
                        <input
                          type="number"
                          min={1}
                          value={entry.quantity}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((row, i) =>
                                i === idx
                                  ? { ...row, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) }
                                  : row
                              )
                            )
                          }
                          className="w-full px-2 py-1 text-xs bg-neutral-950 border border-neutral-700 rounded text-white font-mono text-center"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 text-neutral-500 hover:text-rose-400"
                          title="Remover item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Preço Promocional do Combo (R$) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder={editorTotals.regularSum > 0 ? `Ex: ${(editorTotals.regularSum * 0.9).toFixed(2).replace('.', ',')}` : '28,00'}
                  value={promoPrice}
                  onChange={(e) => setPromoPrice(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-700 rounded-lg text-amber-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Descrição curta (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Deixe em branco para gerar automático"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white"
                />
              </div>
            </div>

            {/* Live Economics Preview */}
            <div className="grid grid-cols-3 gap-2 bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs">
              <div>
                <span className="text-[10px] text-neutral-500 block">Soma Avulsa</span>
                <span className="font-mono font-bold text-neutral-200 tabular-nums">
                  {formatCurrency(editorTotals.regularSum)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block">Economia Cliente</span>
                <span className="font-mono font-bold text-amber-400 tabular-nums">
                  {formatCurrency(editorTotals.savings)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block">Lucro Estimado</span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    editorTotals.estProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(editorTotals.estProfit)}
                </span>
              </div>
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-800 rounded-lg text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Combo</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
