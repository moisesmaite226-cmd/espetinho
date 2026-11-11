import { Customer, DebtTransaction, AppSettings, Sale } from '../types';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatDateOnly(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function sanitizePhoneForWhatsApp(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  // If already starts with 55 and has 12 or 13 digits, keep it
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }
  // If has DDD (10 or 11 digits), prepend Brazil code 55
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export function formatDisplayPhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export type DebtMessageTone = 'amigavel' | 'direto' | 'detalhado';

export function buildWhatsAppDebtMessage(
  customer: Customer,
  settings: AppSettings,
  history: DebtTransaction[],
  tone: DebtMessageTone = 'amigavel',
  customNote?: string
): string {
  const customerName = customer.nickname || customer.name.split(' ')[0];
  const formattedDebt = formatCurrency(customer.totalDebt);
  const pixKey = settings.ownerPixKey || '(combinar com o vendedor)';
  const storeName = settings.storeName || 'Espeto & Gelada';

  // Last purchase summary
  const lastPurchases = history
    .filter((h) => h.type === 'compra')
    .slice(0, 3)
    .map((h) => `• ${formatDateTime(h.timestamp)}: ${h.description} (${formatCurrency(h.amount)})`)
    .join('\n');

  if (tone === 'amigavel') {
    return `Opa ${customerName}, beleza meu amigo? 🍻🍢

Aqui é do *${storeName}*!
Passando só pra te dar um toque do saldo em aberto da caderneta:

💰 *Valor total:* ${formattedDebt}
${lastPurchases ? `\n📝 *Últimos consumos:*\n${lastPurchases}\n` : ''}
🔑 *Chave Pix:* ${pixKey}
${customNote ? `\n${customNote}` : ''}
Quando puder acertar ou dar uma entrada, me dá um alô! Qualquer dúvida estou à disposição. Tmj! 👊`;
  }

  if (tone === 'direto') {
    return `Fala ${customerName}, tudo bem?

Passando para informar o fechamento da sua conta no *${storeName}*:
Total em aberto: *${formattedDebt}*

🔑 *Chave Pix:* ${pixKey}
${customNote ? `\nObs: ${customNote}` : ''}
Por favor, se puder efetuar o pagamento ou mandar o comprovante aqui, eu já dou baixa na caderneta. Muito obrigado!`;
  }

  // tone === 'detalhado'
  return `Olá, ${customer.name}! 🧾

Extrato de consumo no *${storeName}*:
${lastPurchases ? `\n*Detalhamento:*\n${lastPurchases}\n` : ''}
📊 *Saldo Devedor Atual:* ${formattedDebt}
🔑 *Chave Pix para Pagamento:* ${pixKey}
${settings.ownerName ? `Favorecido: ${settings.ownerName}` : ''}

Agradecemos a preferência! Ao realizar o Pix, envie o comprovante por aqui para atualizarmos sua ficha.`;
}

export function buildWhatsAppReceiptMessage(
  sale: Sale,
  settings: AppSettings
): string {
  const itemsText = sale.items
    .map((it) => `• ${it.quantity}x ${it.name} - ${formatCurrency(it.subtotal)}`)
    .join('\n');

  return `🍢 *${settings.storeName}* 🍺
Comprovante de Venda #${sale.id.slice(-4)}
Data: ${formatDateTime(sale.timestamp)}

${itemsText}

*TOTAL:* ${formatCurrency(sale.total)}
*Forma:* ${sale.paymentMethod === 'fiado' ? 'Caderneta (Fiado)' : sale.paymentMethod.toUpperCase()}
${sale.customerName ? `*Cliente:* ${sale.customerName}` : ''}

Agradecemos a sua preferência e volte sempre! 🔥`;
}
