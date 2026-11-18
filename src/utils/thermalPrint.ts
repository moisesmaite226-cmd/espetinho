import { AppSettings, CartItem, Sale } from '../types';
import { formatCurrency, formatDateTime } from './formatters';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function printHtmlViaHiddenFrame(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1500);
    }
  }, 150);
}

export function printKitchenOrder(params: {
  storeName: string;
  tableLabel: string;
  items: CartItem[];
  notes?: string;
}): void {
  const { storeName, tableLabel, items, notes } = params;
  const nowStr = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const rowsHtml = items
    .map(
      (item) => `
      <div class="row">
        <span class="qty">${item.quantity}x</span>
        <span class="name">${escapeHtml(item.displayName)}</span>
      </div>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Comanda Churrasqueira - ${escapeHtml(tableLabel)}</title>
<style>
  @page { margin: 4mm; size: 80mm auto; }
  body {
    font-family: 'Courier New', Courier, monospace;
    width: 72mm;
    margin: 0 auto;
    color: #000;
    font-size: 13px;
    line-height: 1.35;
  }
  .center { text-align: center; }
  .header { border-bottom: 2px dashed #000; padding-bottom: 6px; margin-bottom: 8px; }
  .store { font-size: 12px; font-weight: bold; text-transform: uppercase; }
  .title { font-size: 16px; font-weight: 900; margin: 4px 0; }
  .meta { font-size: 12px; font-weight: bold; }
  .row { display: flex; align-items: flex-start; gap: 8px; padding: 5px 0; border-bottom: 1px dotted #999; }
  .qty { font-size: 17px; font-weight: 900; min-width: 34px; }
  .name { font-size: 14px; font-weight: bold; flex: 1; }
  .notes { margin-top: 8px; padding: 6px; border: 1px solid #000; font-size: 13px; font-weight: bold; }
  .footer { margin-top: 10px; border-top: 2px dashed #000; padding-top: 6px; font-size: 11px; text-align: center; }
</style>
</head>
<body>
  <div class="header center">
    <div class="store">${escapeHtml(storeName || 'Espeto & Gelada')}</div>
    <div class="title">CHURRASQUEIRA / BRASA</div>
    <div class="meta">${escapeHtml(tableLabel.toUpperCase())} · ${nowStr}</div>
  </div>
  <div>${rowsHtml}</div>
  ${notes?.trim() ? `<div class="notes">OBS: ${escapeHtml(notes.trim())}</div>` : ''}
  <div class="footer">Pedido para preparo imediato</div>
</body>
</html>`;

  printHtmlViaHiddenFrame(html);
}

const PAYMENT_NAMES: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_debito: 'Cartão Débito',
  cartao_credito: 'Cartão Crédito',
  fiado: 'Fiado (Caderneta)',
};

export function printCustomerReceipt(params: {
  sale: Sale;
  settings: AppSettings;
}): void {
  const { sale, settings } = params;

  const itemsHtml = sale.items
    .map(
      (item) => `
      <div class="item">
        <div class="item-name">${item.quantity}x ${escapeHtml(item.name)}${
        item.variantName ? ` (${escapeHtml(item.variantName)})` : ''
      }</div>
        <div class="item-prices">
          <span>${item.quantity} x ${escapeHtml(formatCurrency(item.unitPrice))}</span>
          <span>${escapeHtml(formatCurrency(item.subtotal))}</span>
        </div>
      </div>`
    )
    .join('');

  const paymentSummary = sale.splitPayment
    ? `${PAYMENT_NAMES[sale.splitPayment.primaryMethod] || sale.splitPayment.primaryMethod}: ${formatCurrency(
        sale.splitPayment.primaryAmount
      )} + ${PAYMENT_NAMES[sale.splitPayment.secondaryMethod] || sale.splitPayment.secondaryMethod}: ${formatCurrency(
        sale.splitPayment.secondaryAmount
      )}`
    : PAYMENT_NAMES[sale.paymentMethod] || sale.paymentMethod;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Recibo #${escapeHtml(sale.id.slice(-4))}</title>
<style>
  @page { margin: 4mm; size: 80mm auto; }
  body {
    font-family: 'Courier New', Courier, monospace;
    width: 72mm;
    margin: 0 auto;
    color: #000;
    font-size: 12px;
    line-height: 1.35;
  }
  .center { text-align: center; }
  .header { border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
  .store { font-size: 15px; font-weight: 900; text-transform: uppercase; }
  .sub { font-size: 10px; margin-top: 2px; }
  .meta { font-size: 11px; margin-bottom: 6px; border-bottom: 1px dashed #000; padding-bottom: 6px; }
  .item { margin-bottom: 4px; }
  .item-name { font-weight: bold; }
  .item-prices { display: flex; justify-content: space-between; font-size: 11px; }
  .totals { border-top: 1px dashed #000; margin-top: 6px; padding-top: 6px; }
  .line { display: flex; justify-content: space-between; margin: 2px 0; }
  .grand { font-size: 15px; font-weight: 900; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
  .footer { border-top: 1px dashed #000; margin-top: 8px; padding-top: 6px; font-size: 10px; text-align: center; }
</style>
</head>
<body>
  <div class="header center">
    <div class="store">${escapeHtml(settings.storeName || 'Espeto & Gelada')}</div>
    ${settings.storeSubtitle ? `<div class="sub">${escapeHtml(settings.storeSubtitle)}</div>` : ''}
    <div class="sub">CUPOM NÃO FISCAL</div>
  </div>
  <div class="meta">
    <div>Pedido: #${escapeHtml(sale.id.slice(-4))}${sale.tableLabel ? ` · ${escapeHtml(sale.tableLabel)}` : ''}</div>
    <div>Data: ${escapeHtml(formatDateTime(sale.timestamp))}</div>
    ${sale.customerName ? `<div>Cliente: ${escapeHtml(sale.customerName)}</div>` : ''}
  </div>
  <div>${itemsHtml}</div>
  <div class="totals">
    ${
      sale.discount && sale.discount > 0
        ? `<div class="line"><span>Desconto</span><span>- ${escapeHtml(formatCurrency(sale.discount))}</span></div>`
        : ''
    }
    <div class="line grand">
      <span>TOTAL</span>
      <span>${escapeHtml(formatCurrency(sale.total))}</span>
    </div>
    <div class="line">
      <span>Pagamento</span>
      <span>${escapeHtml(paymentSummary)}</span>
    </div>
    ${
      sale.cashReceived !== undefined
        ? `<div class="line"><span>Recebido</span><span>${escapeHtml(formatCurrency(sale.cashReceived))}</span></div>
           <div class="line"><span>Troco</span><span>${escapeHtml(formatCurrency(sale.changeGiven || 0))}</span></div>`
        : ''
    }
  </div>
  ${
    settings.ownerPixKey
      ? `<div class="footer">Pix: ${escapeHtml(settings.ownerPixKey)}</div>`
      : ''
  }
  <div class="footer">Obrigado pela preferência! Volte sempre!</div>
</body>
</html>`;

  printHtmlViaHiddenFrame(html);
}

export function printQrTablePlacard(params: {
  storeName: string;
  storeSubtitle?: string;
  qrSvgMarkup: string;
  menuUrl: string;
}): void {
  const { storeName, storeSubtitle, qrSvgMarkup, menuUrl } = params;
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Placa Cardápio QR - ${escapeHtml(storeName)}</title>
<style>
  @page { margin: 12mm; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    display: flex;
    justify-content: center;
    padding: 20px;
    color: #111;
  }
  .card {
    border: 3px solid #111;
    border-radius: 18px;
    padding: 28px 24px;
    text-align: center;
    max-width: 340px;
    width: 100%;
  }
  .badge {
    display: inline-block;
    background: #f59e0b;
    color: #111;
    font-weight: 800;
    font-size: 12px;
    padding: 4px 12px;
    border-radius: 999px;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  h1 { font-size: 22px; margin: 0 0 4px; }
  p { font-size: 13px; color: #444; margin: 0 0 18px; }
  .qr { display: flex; justify-content: center; margin: 12px 0 16px; }
  .hint { font-size: 14px; font-weight: 700; margin-top: 8px; }
  .url { font-size: 10px; color: #666; word-break: break-all; margin-top: 8px; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge">Cardápio Digital</div>
    <h1>${escapeHtml(storeName)}</h1>
    ${storeSubtitle ? `<p>${escapeHtml(storeSubtitle)}</p>` : '<p>Veja os espetinhos, porções e bebidas disponíveis agora!</p>'}
    <div class="qr">${qrSvgMarkup}</div>
    <div class="hint">Aponte a câmera do celular para ver o cardápio</div>
    <div class="url">${escapeHtml(menuUrl)}</div>
  </div>
</body>
</html>`;

  printHtmlViaHiddenFrame(html);
}
