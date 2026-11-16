import { Product, Sale } from '../types';

export type ProductSortMode = 'mais_vendidos' | 'alfabetica';

// Baseline street-food popularity priority when sales history is tied or empty
const BASELINE_POPULARITY: Record<string, number> = {
  prod_1: 95, // Espetinho de Alcatra
  prod_2: 90, // Frango com Bacon
  prod_7: 94, // Skol / Brahma
  prod_8: 92, // Heineken
  prod_10: 89, // Coca-Cola
  prod_guarana: 86, // Guaraná Antarctica
  prod_9: 84, // Original
  prod_3: 82, // Kafta
  prod_6: 80, // Linguiça
  prod_mandioca: 79, // Mandioca
  prod_5: 77, // Queijo Coalho
  prod_spaten: 75, // Spaten
  prod_budweiser: 73, // Budweiser
  prod_torresmo: 72, // Torresmo
  prod_batata: 70, // Batata
  prod_4: 68, // Coração
  prod_suco_laranja: 64, // Suco de Laranja
  prod_11: 62, // Água Mineral
  prod_energetico: 58, // Red Bull
  prod_farofa_vinagrete: 55, // Farofa + Vinagrete
  molho_alho: 54,
  molho_chimichurri: 52,
  molho_barbecue: 50,
  molho_vinagrete: 48,
};

export function buildSalesCountMap(sales: Sale[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const sale of sales) {
    const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!item?.productId) continue;
      counts[item.productId] = (counts[item.productId] || 0) + (Number(item.quantity) || 0);
    }
  }
  return counts;
}

export function sortProducts(
  products: Product[],
  sortMode: ProductSortMode,
  salesCountMap: Record<string, number>
): Product[] {
  return [...products].sort((a, b) => {
    if (sortMode === 'alfabetica') {
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    }

    const soldA = salesCountMap[a.id] || 0;
    const soldB = salesCountMap[b.id] || 0;
    if (soldB !== soldA) {
      return soldB - soldA;
    }

    const baselineA = BASELINE_POPULARITY[a.id] || 0;
    const baselineB = BASELINE_POPULARITY[b.id] || 0;
    if (baselineB !== baselineA) {
      return baselineB - baselineA;
    }

    return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
  });
}

export function matchesProductFilterTab(product: Product, selectedTab: string): boolean {
  if (selectedTab === 'todos') return true;
  return product.category === selectedTab;
}
