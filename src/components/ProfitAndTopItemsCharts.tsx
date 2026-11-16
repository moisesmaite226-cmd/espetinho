import React, { useMemo, useState, useEffect } from 'react';
import { CashFlowEntry, Product, ProductCategory, Sale } from '../types';
import { formatCurrency } from '../utils/formatters';
import { BarChart3, TrendingUp, Package, Calendar, Flame, Beer, UtensilsCrossed, Droplets, Layers } from 'lucide-react';

interface ProfitAndTopItemsChartsProps {
  sales: Sale[];
  entries: CashFlowEntry[];
  products: Product[];
  filterPeriod: 'hoje' | '7dias' | 'mes' | 'personalizado' | 'todos';
  periodLabel: string;
  onSelectAllPeriod: () => void;
}

type TimeGranularity = 'hora' | 'dia';
type ProfitChartMode = 'comparativo' | 'lucro_liquido';
type TopItemMetric = 'quantidade' | 'faturamento' | 'lucro';
type CategoryFilter = 'todos' | ProductCategory;

interface TimeBucket {
  key: string;
  label: string;
  fullLabel: string;
  revenue: number;
  expensesAndCosts: number;
  netProfit: number;
  salesCount: number;
}

interface ProductRankingItem {
  productId: string;
  name: string;
  category: ProductCategory;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
}

export const ProfitAndTopItemsCharts: React.FC<ProfitAndTopItemsChartsProps> = ({
  sales,
  entries,
  products,
  filterPeriod,
  periodLabel,
  onSelectAllPeriod,
}) => {
  const [granularity, setGranularity] = useState<TimeGranularity>(
    filterPeriod === 'hoje' ? 'hora' : 'dia'
  );
  const [profitMode, setProfitMode] = useState<ProfitChartMode>('comparativo');
  const [activeBucketIndex, setActiveBucketIndex] = useState<number | null>(null);

  const [topMetric, setTopMetric] = useState<TopItemMetric>('quantidade');
  const [topCategory, setTopCategory] = useState<CategoryFilter>('todos');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    setGranularity(filterPeriod === 'hoje' ? 'hora' : 'dia');
    setActiveBucketIndex(null);
  }, [filterPeriod]);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const resolveSaleMath = (sale: Sale) => {
    let totalCost = 0;
    for (const item of sale.items) {
      let unitCost = item.unitCost;
      if (typeof unitCost !== 'number') {
        const prod = productById.get(item.productId);
        if (prod) {
          const matchedVariant =
            item.variantName && prod.variants
              ? prod.variants.find((v) => v.name === item.variantName)
              : undefined;
          unitCost = matchedVariant ? matchedVariant.costPrice : prod.costPrice;
        } else {
          unitCost = 0;
        }
      }
      totalCost += unitCost * item.quantity;
    }

    let fiadoAmount = 0;
    if (sale.splitPayment) {
      if (sale.splitPayment.primaryMethod === 'fiado') fiadoAmount += sale.splitPayment.primaryAmount;
      if (sale.splitPayment.secondaryMethod === 'fiado') fiadoAmount += sale.splitPayment.secondaryAmount;
    } else if (sale.paymentMethod === 'fiado') {
      fiadoAmount = sale.total;
    }

    const clampedFiado = Math.min(sale.total, Math.max(0, fiadoAmount));
    const paidRevenue = Math.max(0, sale.total - clampedFiado);
    return { paidRevenue, totalCost };
  };

  // Build chronological buckets for the Profit Chart
  const buckets = useMemo<TimeBucket[]>(() => {
    const map = new Map<string, TimeBucket>();

    const getBucketKeys = (isoTimestamp: string) => {
      const d = new Date(isoTimestamp);
      if (isNaN(d.getTime())) {
        return { key: isoTimestamp.slice(0, 10), label: isoTimestamp.slice(5, 10), fullLabel: isoTimestamp.slice(0, 10) };
      }
      if (granularity === 'hora') {
        const hour = String(d.getHours()).padStart(2, '0');
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const key = filterPeriod === 'hoje' ? `${dateKey}T${hour}` : `H_${hour}`;
        const label = `${hour}h`;
        const fullLabel = filterPeriod === 'hoje'
          ? `Hoje às ${hour}:00`
          : `Horário ${hour}:00 – ${hour}:59`;
        return { key, label, fullLabel };
      }

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      return { key, label: `${dd}/${mm}`, fullLabel: `${dd}/${mm}/${yyyy}` };
    };

    const ensureBucket = (isoTimestamp: string): TimeBucket => {
      const { key, label, fullLabel } = getBucketKeys(isoTimestamp);
      const existing = map.get(key);
      if (existing) return existing;
      const created: TimeBucket = {
        key,
        label,
        fullLabel,
        revenue: 0,
        expensesAndCosts: 0,
        netProfit: 0,
        salesCount: 0,
      };
      map.set(key, created);
      return created;
    };

    sales.forEach((sale) => {
      const bucket = ensureBucket(sale.timestamp);
      const { paidRevenue, totalCost } = resolveSaleMath(sale);
      bucket.revenue += paidRevenue;
      bucket.expensesAndCosts += totalCost;
      bucket.salesCount += 1;
    });

    entries.forEach((entry) => {
      if (entry.type === 'saida') {
        const bucket = ensureBucket(entry.timestamp);
        bucket.expensesAndCosts += entry.amount;
      } else if (entry.type === 'entrada' && entry.category === 'recebimento_fiado') {
        const bucket = ensureBucket(entry.timestamp);
        bucket.revenue += entry.amount;
      }
    });

    const list = Array.from(map.values()).map((b) => ({
      ...b,
      netProfit: b.revenue - b.expensesAndCosts,
    }));

    list.sort((a, b) => a.key.localeCompare(b.key));
    return list.slice(-14); // Keep at most 14 readable bars
  }, [sales, entries, granularity, filterPeriod, productById]);

  const totalsSummary = useMemo(() => {
    const totalRevenue = buckets.reduce((s, b) => s + b.revenue, 0);
    const totalCosts = buckets.reduce((s, b) => s + b.expensesAndCosts, 0);
    const totalProfit = totalRevenue - totalCosts;
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const bestBucket = buckets.reduce<TimeBucket | null>(
      (best, curr) => (!best || curr.netProfit > best.netProfit ? curr : best),
      null
    );
    return { totalRevenue, totalCosts, totalProfit, margin, bestBucket };
  }, [buckets]);

  // Build Top-Selling Items Ranking from filtered sales
  const rankedProducts = useMemo<ProductRankingItem[]>(() => {
    const map = new Map<string, ProductRankingItem>();

    sales.forEach((sale) => {
      const saleGross = sale.items.reduce((s, it) => s + it.subtotal, 0);
      const discountRatio =
        sale.discount && sale.discount > 0 && saleGross > 0
          ? Math.max(0, (saleGross - sale.discount) / saleGross)
          : 1;

      sale.items.forEach((item) => {
        const catalogProd = productById.get(item.productId);
        const category: ProductCategory = catalogProd?.category || 'outro';

        let unitCost = item.unitCost;
        if (typeof unitCost !== 'number') {
          const matchedVariant =
            item.variantName && catalogProd?.variants
              ? catalogProd.variants.find((v) => v.name === item.variantName)
              : undefined;
          unitCost = matchedVariant ? matchedVariant.costPrice : catalogProd?.costPrice || 0;
        }

        const itemRevenue = item.subtotal * discountRatio;
        const itemCost = unitCost * item.quantity;
        const itemProfit = itemRevenue - itemCost;

        const key = item.productId || item.name;
        const displayName = catalogProd?.name || item.name.split(' (')[0];
        const existing = map.get(key);

        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += itemRevenue;
          existing.cost += itemCost;
          existing.profit += itemProfit;
        } else {
          map.set(key, {
            productId: key,
            name: displayName,
            category,
            quantity: item.quantity,
            revenue: itemRevenue,
            cost: itemCost,
            profit: itemProfit,
          });
        }
      });
    });

    const filtered = Array.from(map.values()).filter(
      (item) => topCategory === 'todos' || item.category === topCategory
    );

    filtered.sort((a, b) => {
      if (topMetric === 'quantidade') return b.quantity - a.quantity || b.revenue - a.revenue;
      if (topMetric === 'faturamento') return b.revenue - a.revenue;
      return b.profit - a.profit;
    });

    return filtered.slice(0, 8);
  }, [sales, productById, topCategory, topMetric]);

  const maxTopValue = useMemo(() => {
    if (rankedProducts.length === 0) return 1;
    const values = rankedProducts.map((p) => {
      if (topMetric === 'quantidade') return p.quantity;
      if (topMetric === 'faturamento') return p.revenue;
      return Math.max(0, p.profit);
    });
    return Math.max(1, ...values);
  }, [rankedProducts, topMetric]);

  // SVG Geometry for Profit Chart
  const svgWidth = 560;
  const svgHeight = 230;
  const padLeft = 10;
  const padRight = 10;
  const padTop = 24;
  const padBottom = 28;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const { maxVal, minVal, zeroY, valueToY } = useMemo(() => {
    if (buckets.length === 0) {
      return {
        maxVal: 100,
        minVal: 0,
        zeroY: padTop + plotH,
        valueToY: () => padTop + plotH,
      };
    }

    const candidates: number[] = [0];
    buckets.forEach((b) => {
      if (profitMode === 'comparativo') {
        candidates.push(b.revenue, b.expensesAndCosts, b.netProfit);
      } else {
        candidates.push(b.netProfit);
      }
    });

    const rawMax = Math.max(...candidates, 10);
    const rawMin = Math.min(...candidates, 0);
    const span = Math.max(10, rawMax - rawMin);
    const paddedMax = rawMax + span * 0.12;
    const paddedMin = rawMin < 0 ? rawMin - span * 0.12 : 0;
    const totalRange = Math.max(1, paddedMax - paddedMin);

    const toY = (v: number) => padTop + ((paddedMax - v) / totalRange) * plotH;
    return {
      maxVal: paddedMax,
      minVal: paddedMin,
      zeroY: toY(0),
      valueToY: toY,
    };
  }, [buckets, profitMode, plotH]);

  const highlightedBucket =
    activeBucketIndex !== null && buckets[activeBucketIndex]
      ? buckets[activeBucketIndex]
      : buckets.length > 0
      ? buckets[buckets.length - 1]
      : null;

  const categoryLabels: Record<ProductCategory, string> = {
    espeto: 'Espeto',
    porcao: 'Porção',
    bebida: 'Bebida',
    molho: 'Molho',
    outro: 'Outro',
  };

  return (
    <section
      id="graficos-lucro"
      className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      aria-label="Gráficos de Lucro e Itens Mais Vendidos"
    >
      {/* CHART 1: Lucro, Faturamento & Gastos */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Gráfico de Lucro Real ({periodLabel})</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Entradas reais vs custos e gastos, com linha de lucro líquido no bolso.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 shrink-0">
              <button
                type="button"
                onClick={() => setGranularity('hora')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                  granularity === 'hora'
                    ? 'bg-neutral-800 text-amber-300'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Por Hora
              </button>
              <button
                type="button"
                onClick={() => setGranularity('dia')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                  granularity === 'dia'
                    ? 'bg-neutral-800 text-amber-300'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Por Dia
              </button>
            </div>
          </div>

          {/* Summary KPI strip + Mode switch */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/80">
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-neutral-400 block text-[11px]">Lucro no Período</span>
                <strong
                  className={`font-mono font-bold tabular-nums text-sm ${
                    totalsSummary.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(totalsSummary.totalProfit)}
                </strong>
              </div>
              <div className="h-6 w-px bg-neutral-800" />
              <div>
                <span className="text-neutral-400 block text-[11px]">Margem Limpa</span>
                <strong className="font-mono font-bold tabular-nums text-sm text-amber-400">
                  {totalsSummary.margin.toFixed(0)}%
                </strong>
              </div>
              {totalsSummary.bestBucket && (
                <>
                  <div className="hidden sm:block h-6 w-px bg-neutral-800" />
                  <div className="hidden sm:block">
                    <span className="text-neutral-400 block text-[11px]">Melhor Pico</span>
                    <strong className="font-mono font-bold tabular-nums text-sm text-white">
                      {totalsSummary.bestBucket.label} ({formatCurrency(totalsSummary.bestBucket.netProfit)})
                    </strong>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 shrink-0">
              <button
                type="button"
                onClick={() => setProfitMode('comparativo')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                  profitMode === 'comparativo'
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Completo
              </button>
              <button
                type="button"
                onClick={() => setProfitMode('lucro_liquido')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                  profitMode === 'lucro_liquido'
                    ? 'bg-emerald-500 text-neutral-950'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Só Lucro
              </button>
            </div>
          </div>
        </div>

        {/* SVG Chart Body or Empty State */}
        {buckets.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-center bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4">
            <Calendar className="w-8 h-8 text-neutral-600 mb-2" />
            <p className="text-xs font-semibold text-neutral-300">
              Nenhuma movimentação encontrada em "{periodLabel}".
            </p>
            <p className="text-[11px] text-neutral-500 mt-1 max-w-xs">
              Registre uma venda no PDV ou visualize todo o histórico acumulado para ver a curva de lucro.
            </p>
            {filterPeriod !== 'todos' && (
              <button
                type="button"
                onClick={onSelectAllPeriod}
                className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors"
              >
                Ver Histórico Completo
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Interactive Selected Bucket Readout */}
            {highlightedBucket && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px]">
                <span className="font-semibold text-neutral-200">
                  {highlightedBucket.fullLabel}
                  {highlightedBucket.salesCount > 0 && (
                    <span className="text-neutral-500 font-normal ml-1.5">
                      · {highlightedBucket.salesCount} {highlightedBucket.salesCount === 1 ? 'venda' : 'vendas'}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3 font-mono tabular-nums">
                  <span className="text-amber-400">
                    Entrou: <strong>{formatCurrency(highlightedBucket.revenue)}</strong>
                  </span>
                  <span className="text-rose-400">
                    Gastos: <strong>{formatCurrency(highlightedBucket.expensesAndCosts)}</strong>
                  </span>
                  <span
                    className={
                      highlightedBucket.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }
                  >
                    Lucro: <strong>{formatCurrency(highlightedBucket.netProfit)}</strong>
                  </span>
                </div>
              </div>
            )}

            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-56 select-none"
                role="img"
                aria-label="Gráfico de barras e linha de lucro líquido"
              >
                {/* Horizontal grid guides */}
                {[0.25, 0.5, 0.75, 1].map((ratio) => {
                  const val = minVal + (maxVal - minVal) * ratio;
                  const y = valueToY(val);
                  return (
                    <line
                      key={ratio}
                      x1={padLeft}
                      x2={svgWidth - padRight}
                      y1={y}
                      y2={y}
                      stroke="#262626"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Zero baseline */}
                <line
                  x1={padLeft}
                  x2={svgWidth - padRight}
                  y1={zeroY}
                  y2={zeroY}
                  stroke="#525252"
                  strokeWidth="1.2"
                />

                {/* Bars per bucket */}
                {buckets.map((bucket, idx) => {
                  const slotW = plotW / buckets.length;
                  const centerX = padLeft + slotW * idx + slotW / 2;
                  const isActive =
                    activeBucketIndex === idx ||
                    (activeBucketIndex === null && idx === buckets.length - 1);

                  if (profitMode === 'comparativo') {
                    const barW = Math.min(20, Math.max(8, slotW * 0.28));
                    const revY = valueToY(bucket.revenue);
                    const expY = valueToY(bucket.expensesAndCosts);
                    const revH = Math.max(2, zeroY - revY);
                    const expH = Math.max(2, zeroY - expY);

                    return (
                      <g
                        key={bucket.key}
                        onMouseEnter={() => setActiveBucketIndex(idx)}
                        onClick={() => setActiveBucketIndex(idx)}
                        className="cursor-pointer"
                      >
                        {isActive && (
                          <rect
                            x={centerX - slotW * 0.44}
                            y={padTop - 6}
                            width={slotW * 0.88}
                            height={plotH + 10}
                            rx={6}
                            fill="#ffffff"
                            fillOpacity={0.04}
                          />
                        )}
                        <rect
                          x={centerX - barW - 1.5}
                          y={revY}
                          width={barW}
                          height={revH}
                          rx={3}
                          fill="#f59e0b"
                          fillOpacity={isActive ? 0.95 : 0.65}
                        />
                        <rect
                          x={centerX + 1.5}
                          y={expY}
                          width={barW}
                          height={expH}
                          rx={3}
                          fill="#f43f5e"
                          fillOpacity={isActive ? 0.9 : 0.55}
                        />
                        <text
                          x={centerX}
                          y={svgHeight - 8}
                          textAnchor="middle"
                          fill={isActive ? '#fde68a' : '#a3a3a3'}
                          fontSize="10"
                          fontFamily="monospace"
                          fontWeight={isActive ? '700' : '500'}
                        >
                          {bucket.label}
                        </text>
                      </g>
                    );
                  }

                  // Só Lucro Líquido bars
                  const barW = Math.min(34, Math.max(12, slotW * 0.52));
                  const valY = valueToY(bucket.netProfit);
                  const topY = Math.min(valY, zeroY);
                  const barH = Math.max(3, Math.abs(zeroY - valY));
                  const positive = bucket.netProfit >= 0;

                  return (
                    <g
                      key={bucket.key}
                      onMouseEnter={() => setActiveBucketIndex(idx)}
                      onClick={() => setActiveBucketIndex(idx)}
                      className="cursor-pointer"
                    >
                      <rect
                        x={centerX - barW / 2}
                        y={topY}
                        width={barW}
                        height={barH}
                        rx={4}
                        fill={positive ? '#10b981' : '#f43f5e'}
                        fillOpacity={isActive ? 1 : 0.78}
                      />
                      <text
                        x={centerX}
                        y={positive ? Math.max(12, topY - 5) : Math.min(svgHeight - 20, topY + barH + 11)}
                        textAnchor="middle"
                        fill={positive ? '#6ee7b7' : '#fda4af'}
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="700"
                      >
                        {Math.round(bucket.netProfit)}
                      </text>
                      <text
                        x={centerX}
                        y={svgHeight - 8}
                        textAnchor="middle"
                        fill={isActive ? '#6ee7b7' : '#a3a3a3'}
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight={isActive ? '700' : '500'}
                      >
                        {bucket.label}
                      </text>
                    </g>
                  );
                })}

                {/* Net Profit Line Overlay in 'comparativo' mode */}
                {profitMode === 'comparativo' && buckets.length > 0 && (
                  <>
                    {buckets.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={buckets
                          .map((bucket, idx) => {
                            const slotW = plotW / buckets.length;
                            const cx = padLeft + slotW * idx + slotW / 2;
                            const cy = valueToY(bucket.netProfit);
                            return `${cx},${cy}`;
                          })
                          .join(' ')}
                      />
                    )}
                    {buckets.map((bucket, idx) => {
                      const slotW = plotW / buckets.length;
                      const cx = padLeft + slotW * idx + slotW / 2;
                      const cy = valueToY(bucket.netProfit);
                      const isActive =
                        activeBucketIndex === idx ||
                        (activeBucketIndex === null && idx === buckets.length - 1);
                      return (
                        <circle
                          key={`dot_${bucket.key}`}
                          cx={cx}
                          cy={cy}
                          r={isActive ? 5 : 3.5}
                          fill={bucket.netProfit >= 0 ? '#10b981' : '#f43f5e'}
                          stroke="#171717"
                          strokeWidth="1.5"
                          onMouseEnter={() => setActiveBucketIndex(idx)}
                          onClick={() => setActiveBucketIndex(idx)}
                          className="cursor-pointer"
                        />
                      );
                    })}
                  </>
                )}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-neutral-400 pt-1">
              {profitMode === 'comparativo' && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                    Faturamento Recebido
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                    Custos + Gastos
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
                    Lucro Líquido Real
                  </span>
                </>
              )}
              {profitMode === 'lucro_liquido' && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                    Lucro Positivo (R$)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                    Prejuízo / Saldo Negativo
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CHART 2: Itens Que Mais Saem */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Itens Que Mais Saem ({periodLabel})</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Ranking automático dos produtos campeões em quantidade, receita ou lucro.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 shrink-0">
              <button
                type="button"
                onClick={() => setTopMetric('quantidade')}
                className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                  topMetric === 'quantidade'
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Qtd
              </button>
              <button
                type="button"
                onClick={() => setTopMetric('faturamento')}
                className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                  topMetric === 'faturamento'
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Vendas (R$)
              </button>
              <button
                type="button"
                onClick={() => setTopMetric('lucro')}
                className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                  topMetric === 'lucro'
                    ? 'bg-emerald-500 text-neutral-950'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Lucro (R$)
              </button>
            </div>
          </div>

          {/* Category filter pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-800/80">
            {(
              [
                { id: 'todos', label: 'Todos', icon: Layers },
                { id: 'espeto', label: 'Espetos', icon: Flame },
                { id: 'porcao', label: 'Porções', icon: UtensilsCrossed },
                { id: 'bebida', label: 'Bebidas', icon: Beer },
                { id: 'molho', label: 'Molhos', icon: Droplets },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTopCategory(id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  topCategory === id
                    ? 'bg-neutral-800 text-amber-300 border border-amber-500/40'
                    : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal Bars List or Empty State */}
        {rankedProducts.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-center bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4">
            <Package className="w-8 h-8 text-neutral-600 mb-2" />
            <p className="text-xs font-semibold text-neutral-300">
              Nenhum item vendido neste filtro.
            </p>
            <p className="text-[11px] text-neutral-500 mt-1 max-w-xs">
              Assim que registrar vendas no PDV ou ampliar o período, o ranking dos campeões aparece aqui.
            </p>
            {filterPeriod !== 'todos' && (
              <button
                type="button"
                onClick={onSelectAllPeriod}
                className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors"
              >
                Ver Histórico Completo
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {rankedProducts.map((item, idx) => {
              const currentValue =
                topMetric === 'quantidade'
                  ? item.quantity
                  : topMetric === 'faturamento'
                  ? item.revenue
                  : Math.max(0, item.profit);

              const pctWidth = Math.max(6, Math.min(100, (currentValue / maxTopValue) * 100));
              const isExpanded = selectedItemId === item.productId;
              const isTop3 = idx < 3;
              const marginPct = item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0;

              return (
                <button
                  key={item.productId}
                  type="button"
                  onClick={() =>
                    setSelectedItemId(isExpanded ? null : item.productId)
                  }
                  className="w-full text-left group space-y-1 focus:outline-none"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`font-mono font-bold text-[11px] w-5 shrink-0 tabular-nums ${
                          isTop3 ? 'text-amber-400' : 'text-neutral-500'
                        }`}
                      >
                        {idx + 1}º
                      </span>
                      <span className="font-semibold text-neutral-100 group-hover:text-amber-300 truncate transition-colors">
                        {item.name}
                      </span>
                      <span className="hidden sm:inline text-[11px] text-neutral-500 shrink-0">
                        · {categoryLabels[item.category]}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                      <span
                        className={`text-xs font-bold ${
                          topMetric === 'lucro'
                            ? item.profit >= 0
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {topMetric === 'quantidade'
                          ? `${item.quantity} un`
                          : topMetric === 'faturamento'
                          ? formatCurrency(item.revenue)
                          : formatCurrency(item.profit)}
                      </span>
                    </div>
                  </div>

                  {/* Proportional Visual Bar */}
                  <div className="h-2.5 w-full rounded-full bg-neutral-950 border border-neutral-800/80 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        topMetric === 'lucro'
                          ? item.profit >= 0
                            ? isTop3
                              ? 'bg-emerald-500'
                              : 'bg-emerald-600/75'
                            : 'bg-rose-500'
                          : isTop3
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                          : 'bg-amber-500/55'
                      }`}
                      style={{ width: `${pctWidth}%` }}
                    />
                  </div>

                  {/* Expandable Detail Line on Click/Tap */}
                  {isExpanded && (
                    <div className="flex flex-wrap items-center gap-3 pl-7 pt-0.5 text-[11px] font-mono text-neutral-400 tabular-nums">
                      <span>Saíram: {item.quantity} un</span>
                      <span>·</span>
                      <span>Receita: {formatCurrency(item.revenue)}</span>
                      <span>·</span>
                      <span className="text-emerald-400">
                        Lucro: {formatCurrency(item.profit)} ({marginPct.toFixed(0)}%)
                      </span>
                    </div>
                  )}
                </button>
              );
            })}

            <p className="text-[11px] text-neutral-500 pt-1">
              Dica: toque em qualquer item acima para ver quantidade, faturamento e lucro detalhado.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
