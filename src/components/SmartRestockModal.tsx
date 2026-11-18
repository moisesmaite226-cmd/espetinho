import React, { useState, useMemo } from 'react';
import { Product, Sale } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  ShoppingCart,
  X,
  Copy,
  Check,
  PackagePlus,
  TrendingUp,
  Share2,
} from 'lucide-react';

interface SmartRestockModalProps {
  products: Product[];
  sales: Sale[];
  onApplyRestock: (
    items: { productId: string; quantityToAdd: number; estimatedCost: number; name: string }[],
    recordCashOut: boolean
  ) => void;
  onClose: () => void;
}

interface RestockSuggestion {
  product: Product;
  soldLast30Days: number;
  dailyAvg: number;
  targetStock: number;
  suggestedQty: number;
  selected: boolean;
}

export const SmartRestockModal: React.FC<SmartRestockModalProps> = ({
  products,
  sales,
  onApplyRestock,
  onClose,
}) => {
  const [horizonDays, setHorizonDays] = useState<number>(7);
  const [recordCashOut, setRecordCashOut] = useState<boolean>(true);
  const [copiedList, setCopiedList] = useState(false);

  // Calculate sales velocity per product over the last 30 days
  const initialRows = useMemo(() => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const recentSales = sales.filter((s) => new Date(s.timestamp).getTime() >= thirtyDaysAgo);

    const soldMap = new Map<string, number>();
    let earliestTs = now;
    for (const s of recentSales) {
      const ts = new Date(s.timestamp).getTime();
      if (ts < earliestTs) earliestTs = ts;
      for (const item of s.items) {
        soldMap.set(item.productId, (soldMap.get(item.productId) || 0) + item.quantity);
      }
    }

    const activeWindowDays = Math.max(
      1,
      Math.min(30, Math.ceil((now - earliestTs) / (24 * 60 * 60 * 1000)) || 1)
    );

    const list: RestockSuggestion[] = [];
    for (const product of products) {
      if (!product.active) continue;
      const sold30 = soldMap.get(product.id) || 0;
      const dailyAvg = sold30 / activeWindowDays;
      // Target stock covers horizonDays of historical demand OR at least 2x minStock
      const demandTarget = Math.ceil(dailyAvg * horizonDays);
      const minBaseline = Math.max(product.minStock * 2, product.stock <= 0 ? 12 : 0);
      const targetStock = Math.max(demandTarget, minBaseline);
      const gap = Math.max(0, targetStock - product.stock);

      if (gap > 0 || product.stock <= product.minStock) {
        const suggestedQty = Math.max(gap, product.stock <= product.minStock ? 6 : 0);
        if (suggestedQty > 0) {
          list.push({
            product,
            soldLast30Days: sold30,
            dailyAvg,
            targetStock,
            suggestedQty,
            selected: product.stock <= product.minStock || sold30 > 0,
          });
        }
      }
    }

    return list.sort((a, b) => {
      if (a.product.stock <= 0 && b.product.stock > 0) return -1;
      if (b.product.stock <= 0 && a.product.stock > 0) return 1;
      return b.soldLast30Days - a.soldLast30Days;
    });
  }, [products, sales, horizonDays]);

  const [qtyOverrides, setQtyOverrides] = useState<Record<string, number>>({});
  const [deselectedIds, setDeselectedIds] = useState<Set<string>>(new Set());

  const rows = initialRows.map((r) => ({
    ...r,
    suggestedQty:
      qtyOverrides[r.product.id] !== undefined
        ? qtyOverrides[r.product.id]
        : r.suggestedQty,
    selected: !deselectedIds.has(r.product.id) && r.selected,
  }));

  const selectedRows = rows.filter((r) => r.selected && r.suggestedQty > 0);
  const totalEstimatedCost = selectedRows.reduce(
    (sum, r) => sum + r.suggestedQty * r.product.costPrice,
    0
  );

  const toggleSelect = (productId: string) => {
    setDeselectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const updateQty = (productId: string, nextQty: number) => {
    setQtyOverrides((prev) => ({ ...prev, [productId]: Math.max(0, nextQty) }));
  };

  const buildShoppingText = () => {
    const lines = [
      `🛒 *LISTA DE COMPRAS / REPOSIÇÃO (${horizonDays} DIAS)*`,
      '',
      ...selectedRows.map(
        (r) =>
          `• *${r.suggestedQty}x* ${r.product.name} (est. atual: ${r.product.stock}) — ~${formatCurrency(
            r.suggestedQty * r.product.costPrice
          )}`
      ),
      '',
      `💰 *Custo Total Estimado:* ${formatCurrency(totalEstimatedCost)}`,
    ];
    return lines.join('\n');
  };

  const handleCopyList = () => {
    navigator.clipboard.writeText(buildShoppingText());
    setCopiedList(true);
    setTimeout(() => setCopiedList(false), 2500);
  };

  const handleConfirmRestock = () => {
    if (selectedRows.length === 0) return;
    onApplyRestock(
      selectedRows.map((r) => ({
        productId: r.product.id,
        quantityToAdd: r.suggestedQty,
        estimatedCost: r.suggestedQty * r.product.costPrice,
        name: r.product.name,
      })),
      recordCashOut
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-neutral-800 pb-3 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Previsão Inteligente de Compras (Atacadão / Açougue)
              </h3>
              <p className="text-xs text-neutral-400">
                Calculado pelo giro real de vendas + estoque mínimo de segurança
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

        {/* Horizon selector & summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-950 border border-neutral-800 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">Repor estoque para:</span>
            {[3, 7, 15].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => {
                  setHorizonDays(days);
                  setQtyOverrides({});
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  horizonDays === days
                    ? 'bg-amber-500 text-neutral-950'
                    : 'bg-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                {days} dias
              </button>
            ))}
          </div>

          <div className="text-right">
            <span className="text-[11px] text-neutral-400 block">
              Custo estimado ({selectedRows.length} itens)
            </span>
            <span className="text-base font-mono font-bold text-amber-400 tabular-nums">
              {formatCurrency(totalEstimatedCost)}
            </span>
          </div>
        </div>

        {/* Items list */}
        <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
          {rows.length === 0 ? (
            <div className="p-8 text-center bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-400">
              Seu estoque está folgado para os próximos {horizonDays} dias! Nenhum item urgente para comprar.
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.product.id}
                className={`bg-neutral-950 border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  row.selected ? 'border-neutral-700' : 'border-neutral-800/60 opacity-50'
                }`}
              >
                <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={() => toggleSelect(row.product.id)}
                    className="mt-1 rounded border-neutral-600 text-amber-500 focus:ring-amber-500"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{row.product.name}</span>
                      {row.product.stock <= 0 ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                          ZERADO
                        </span>
                      ) : row.product.stock <= row.product.minStock ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          Baixo ({row.product.stock} {row.product.unit})
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-500 font-mono">
                          Atual: {row.product.stock} {row.product.unit}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      <span>
                        {row.soldLast30Days > 0
                          ? `Saíram ${row.soldLast30Days} un recentemente · Custo un: ${formatCurrency(row.product.costPrice)}`
                          : `Abaixo da margem segura (mín: ${row.product.minStock}) · Custo un: ${formatCurrency(row.product.costPrice)}`}
                      </span>
                    </p>
                  </div>
                </label>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-neutral-400">Comprar:</span>
                    <input
                      type="number"
                      min={0}
                      value={row.suggestedQty}
                      onChange={(e) =>
                        updateQty(row.product.id, parseInt(e.target.value, 10) || 0)
                      }
                      className="w-16 px-2 py-1 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono font-bold text-center"
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400 tabular-nums w-20 text-right">
                    {formatCurrency(row.suggestedQty * row.product.costPrice)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {rows.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-neutral-300 bg-neutral-950 border border-neutral-800 rounded-xl p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={recordCashOut}
              onChange={(e) => setRecordCashOut(e.target.checked)}
              className="rounded border-neutral-600 text-amber-500 focus:ring-amber-500"
            />
            <span>
              Ao dar entrada no estoque, lançar automaticamente a saída de{' '}
              <strong className="text-amber-400 font-mono">{formatCurrency(totalEstimatedCost)}</strong>{' '}
              no Fluxo de Caixa
            </span>
          </label>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={selectedRows.length === 0}
              onClick={handleCopyList}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 text-xs font-semibold flex items-center gap-1.5"
            >
              {copiedList ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedList ? 'Lista Copiada!' : 'Copiar Lista'}</span>
            </button>

            {selectedRows.length > 0 && (
              <a
                href={`https://wa.me/?text=${encodeURIComponent(buildShoppingText())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Mandar no WhatsApp</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-neutral-800 text-neutral-300 rounded-xl"
            >
              Fechar
            </button>
            {selectedRows.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmRestock}
                className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl flex items-center gap-1.5"
              >
                <PackagePlus className="w-4 h-4" />
                <span>Dar Entrada no Estoque</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
