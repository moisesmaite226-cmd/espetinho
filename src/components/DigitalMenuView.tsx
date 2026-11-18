import React, { useMemo, useRef, useState } from 'react';
import { AppSettings, ComboOffer, Product, ProductCategory } from '../types';
import { formatCurrency } from '../utils/formatters';
import { printQrTablePlacard } from '../utils/thermalPrint';
import { QRCodeSVG } from 'qrcode.react';
import {
  Flame,
  Beer,
  UtensilsCrossed,
  Droplets,
  Sparkles,
  QrCode,
  Copy,
  Check,
  Printer,
  Share2,
  X,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';

interface DigitalMenuViewProps {
  products: Product[];
  combos: ComboOffer[];
  settings: AppSettings;
  isPublicCustomerPage?: boolean;
  onExitCustomerPage?: () => void;
  onOpenCustomerPreview?: () => void;
  onCloseModal?: () => void;
}

const CATEGORY_ORDER: { key: ProductCategory; label: string; icon: React.ReactNode }[] = [
  { key: 'espeto', label: 'Espetinhos na Brasa', icon: <Flame className="w-4 h-4 text-orange-400" /> },
  { key: 'porcao', label: 'Porções & Acompanhamentos', icon: <UtensilsCrossed className="w-4 h-4 text-amber-400" /> },
  { key: 'bebida', label: 'Bebidas Geladas', icon: <Beer className="w-4 h-4 text-sky-400" /> },
  { key: 'molho', label: 'Molhos Especiais', icon: <Droplets className="w-4 h-4 text-emerald-400" /> },
];

export const DigitalMenuView: React.FC<DigitalMenuViewProps> = ({
  products,
  combos,
  settings,
  isPublicCustomerPage = false,
  onExitCustomerPage,
  onOpenCustomerPreview,
  onCloseModal,
}) => {
  const [copiedMenuText, setCopiedMenuText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const qrWrapperRef = useRef<HTMLDivElement>(null);

  const menuUrl = useMemo(() => {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}?cardapio=1`;
  }, []);

  const availableProducts = useMemo(
    () => products.filter((p) => p.active && p.stock > 0),
    [products]
  );

  const availableCombos = useMemo(
    () =>
      combos.filter(
        (c) =>
          c.active !== false &&
          c.items.every((entry) => {
            const p = products.find((prod) => prod.id === entry.productId);
            return Boolean(p && p.active && p.stock >= entry.quantity);
          })
      ),
    [combos, products]
  );

  const buildWhatsAppMenuText = () => {
    const sections: string[] = [
      `🔥 *CARDÁPIO DO DIA — ${settings.storeName.toUpperCase()}*`,
      settings.storeSubtitle ? `_${settings.storeSubtitle}_` : '',
      '',
    ];

    if (availableCombos.length > 0) {
      sections.push('*⭐ COMBOS PROMOCIONAIS*');
      for (const c of availableCombos) {
        sections.push(`• *${c.name}* — ${formatCurrency(c.promoPrice)} (${c.description})`);
      }
      sections.push('');
    }

    for (const cat of CATEGORY_ORDER) {
      const catItems = availableProducts
        .filter((p) => p.category === cat.key)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      if (catItems.length === 0) continue;

      sections.push(`*${cat.label.toUpperCase()}*`);
      for (const p of catItems) {
        if (p.variants && p.variants.length > 0) {
          const vars = p.variants.map((v) => `${v.name}: ${formatCurrency(v.price)}`).join(' | ');
          sections.push(`• *${p.name}* (${vars})`);
        } else {
          sections.push(`• *${p.name}* — ${formatCurrency(p.price)}`);
        }
      }
      sections.push('');
    }

    if (settings.ownerPixKey) {
      sections.push(`📱 *Pix para pedidos:* ${settings.ownerPixKey}`);
    }

    return sections.filter((s) => s !== undefined).join('\n');
  };

  const handleCopyMenuText = () => {
    navigator.clipboard.writeText(buildWhatsAppMenuText());
    setCopiedMenuText(true);
    setTimeout(() => setCopiedMenuText(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handlePrintQrPlacard = () => {
    const svgEl = qrWrapperRef.current?.querySelector('svg');
    if (!svgEl) return;
    printQrTablePlacard({
      storeName: settings.storeName || 'Espeto & Gelada',
      storeSubtitle: settings.storeSubtitle,
      qrSvgMarkup: svgEl.outerHTML,
      menuUrl,
    });
  };

  // Full clean Customer View (QR Code / Tablet on Table)
  if (isPublicCustomerPage) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-14">
        <header className="sticky top-0 z-30 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 px-4 py-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-neutral-950">
                <Flame className="w-6 h-6 fill-neutral-950" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-white leading-tight">
                  {settings.storeName}
                </h1>
                <p className="text-xs text-amber-400">
                  {settings.storeSubtitle || 'Cardápio Digital Atualizado'}
                </p>
              </div>
            </div>

            {onExitCustomerPage && (
              <button
                type="button"
                onClick={onExitCustomerPage}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar p/ Balcão</span>
              </button>
            )}
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
          {availableCombos.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Combos Especiais</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableCombos.map((combo) => (
                  <div
                    key={combo.id}
                    className="bg-neutral-900 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-white">{combo.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          {combo.badge}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">{combo.description}</p>
                    </div>
                    <div className="text-lg font-mono font-extrabold text-amber-400 tabular-nums pt-1">
                      {formatCurrency(combo.promoPrice)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {CATEGORY_ORDER.map((cat) => {
            const catItems = availableProducts
              .filter((p) => p.category === cat.key)
              .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
            if (catItems.length === 0) return null;

            return (
              <section key={cat.key} className="space-y-3">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2 border-b border-neutral-800 pb-2">
                  {cat.icon}
                  <span>{cat.label}</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {catItems.map((p) => (
                    <div
                      key={p.id}
                      className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex gap-3 p-3"
                    >
                      {p.imageUrl && (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          className="w-20 h-20 rounded-xl object-cover shrink-0 bg-neutral-800"
                        />
                      )}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-white leading-snug">{p.name}</h3>
                          {p.portionSizeDescription && (
                            <p className="text-[11px] text-neutral-400 mt-0.5">
                              {p.portionSizeDescription}
                            </p>
                          )}
                        </div>

                        {p.variants && p.variants.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {p.variants.map((v) => (
                              <span
                                key={v.id}
                                className="text-[11px] font-mono bg-neutral-950 border border-neutral-800 px-2 py-0.5 rounded-lg text-amber-400 font-bold tabular-nums"
                              >
                                {v.name}: {formatCurrency(v.price)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-base font-mono font-extrabold text-amber-400 tabular-nums mt-1">
                            {formatCurrency(p.price)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {availableProducts.length === 0 && (
            <div className="p-10 text-center bg-neutral-900 border border-neutral-800 rounded-2xl text-sm text-neutral-400">
              Cardápio em atualização no momento.
            </div>
          )}

          {settings.ownerPixKey && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-center space-y-1">
              <span className="text-xs text-neutral-400 block">Chave Pix do Estabelecimento</span>
              <span className="text-sm font-mono font-bold text-amber-400">{settings.ownerPixKey}</span>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Owner QR Code & Share Modal
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cardápio Digital & QR Code da Mesa</h3>
              <p className="text-xs text-neutral-400">
                Mostra só itens disponíveis agora (sem custos ou dados do caixa)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseModal}
            className="text-neutral-500 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 flex flex-col items-center text-center space-y-3">
          <div ref={qrWrapperRef} className="bg-white p-3 rounded-2xl shadow-md">
            <QRCodeSVG value={menuUrl} size={176} level="M" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">
              {availableProducts.length} itens disponíveis · {availableCombos.length} combos ativos
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5 break-all">{menuUrl}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handlePrintQrPlacard}
            className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Placa QR Code</span>
          </button>

          {onOpenCustomerPreview && (
            <button
              type="button"
              onClick={onOpenCustomerPreview}
              className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4 text-amber-400" />
              <span>Abrir Modo Cliente</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyMenuText}
            className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            {copiedMenuText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedMenuText ? 'Cardápio Copiado!' : 'Copiar Texto p/ WhatsApp'}</span>
          </button>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(buildWhatsAppMenuText())}`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            <span>Enviar Cardápio no WhatsApp</span>
          </a>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
          <button
            type="button"
            onClick={handleCopyLink}
            className="text-xs text-amber-400 hover:text-amber-300 underline"
          >
            {copiedLink ? 'Link copiado!' : 'Copiar link do cardápio'}
          </button>
          <button
            type="button"
            onClick={onCloseModal}
            className="px-4 py-2 text-xs font-semibold bg-neutral-800 text-neutral-300 rounded-xl"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
