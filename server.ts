import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import { 
  products, 
  customers, 
  sales, 
  debtTransactions, 
  cashFlow, 
  settings 
} from './src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_CUSTOMERS, 
  INITIAL_DEBT_TRANSACTIONS, 
  INITIAL_CASH_FLOW, 
  INITIAL_SETTINGS 
} from './src/data/initialData.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper function to seed database if empty
async function seedDatabaseIfEmpty() {
  try {
    const existingProducts = await db.select().from(products).limit(1);
    if (existingProducts.length === 0) {
      console.log('Seeding initial products into PostgreSQL...');
      for (const p of INITIAL_PRODUCTS) {
        await db.insert(products).values({
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          costPrice: p.costPrice,
          stock: p.stock,
          minStock: p.minStock,
          unit: p.unit,
          portionSizeDescription: p.portionSizeDescription,
          variants: p.variants ? JSON.stringify(p.variants) : null,
          imageUrl: p.imageUrl,
          active: p.active,
        }).onConflictDoNothing();
      }
    } else {
      const existingSauces = await db.select().from(products).where(eq(products.category, 'molho')).limit(1);
      if (existingSauces.length === 0) {
        console.log('Seeding sauce products (molho) into PostgreSQL...');
        for (const p of INITIAL_PRODUCTS.filter((item) => item.category === 'molho')) {
          await db.insert(products).values({
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.price,
            costPrice: p.costPrice,
            stock: p.stock,
            minStock: p.minStock,
            unit: p.unit,
            portionSizeDescription: p.portionSizeDescription,
            variants: p.variants ? JSON.stringify(p.variants) : null,
            imageUrl: p.imageUrl,
            active: p.active,
          }).onConflictDoNothing();
        }
      }
    }

    // Migrate any legacy /src/assets/images/ paths in PostgreSQL to /images/
    const allProds = await db.select().from(products);
    for (const prod of allProds) {
      if (prod.imageUrl && prod.imageUrl.startsWith('/src/assets/images/')) {
        await db
          .update(products)
          .set({ imageUrl: prod.imageUrl.replace('/src/assets/images/', '/images/') })
          .where(eq(products.id, prod.id));
      }
    }

    const existingCustomers = await db.select().from(customers).limit(1);
    if (existingCustomers.length === 0) {
      console.log('Seeding initial customers into PostgreSQL...');
      for (const c of INITIAL_CUSTOMERS) {
        await db.insert(customers).values({
          id: c.id,
          name: c.name,
          nickname: c.nickname,
          phone: c.phone,
          creditLimit: c.creditLimit,
          totalDebt: c.totalDebt,
          notes: c.notes,
          createdAt: c.createdAt,
          lastPurchaseAt: c.lastPurchaseAt,
        }).onConflictDoNothing();
      }
    }

    const existingDebts = await db.select().from(debtTransactions).limit(1);
    if (existingDebts.length === 0) {
      console.log('Seeding initial debt transactions...');
      for (const d of INITIAL_DEBT_TRANSACTIONS) {
        await db.insert(debtTransactions).values({
          id: d.id,
          customerId: d.customerId,
          customerName: d.customerName,
          type: d.type,
          amount: d.amount,
          remainingDebtAfter: d.remainingDebtAfter,
          timestamp: d.timestamp,
          paymentMethodUsed: d.paymentMethodUsed,
          description: d.description,
          itemsSummary: d.itemsSummary,
        }).onConflictDoNothing();
      }
    }

    const existingCashFlow = await db.select().from(cashFlow).limit(1);
    if (existingCashFlow.length === 0) {
      console.log('Seeding initial cash flow...');
      for (const cf of INITIAL_CASH_FLOW) {
        await db.insert(cashFlow).values({
          id: cf.id,
          timestamp: cf.timestamp,
          type: cf.type,
          category: cf.category,
          amount: cf.amount,
          description: cf.description,
          paymentMethod: cf.paymentMethod,
        }).onConflictDoNothing();
      }
    }

    const existingSettings = await db.select().from(settings).limit(1);
    if (existingSettings.length === 0) {
      console.log('Seeding settings...');
      await db.insert(settings).values({
        storeName: INITIAL_SETTINGS.storeName,
        storeSubtitle: INITIAL_SETTINGS.storeSubtitle,
        ownerPixKey: INITIAL_SETTINGS.ownerPixKey,
        pixKeyType: INITIAL_SETTINGS.pixKeyType,
        ownerName: INITIAL_SETTINGS.ownerName,
        defaultCreditLimit: INITIAL_SETTINGS.defaultCreditLimit,
      });
    }
  } catch (err) {
    console.error('Error during initial database seed check:', err);
  }
}

// ================= API ROUTES =================

// 1. Bootstrap: get all state at once
app.get('/api/bootstrap', async (_req: Request, res: Response) => {
  try {
    const [
      dbProducts, 
      dbCustomers, 
      dbSales, 
      dbDebts, 
      dbCashFlow, 
      dbSettings
    ] = await Promise.all([
      db.select().from(products),
      db.select().from(customers),
      db.select().from(sales).orderBy(desc(sales.timestamp)),
      db.select().from(debtTransactions).orderBy(desc(debtTransactions.timestamp)),
      db.select().from(cashFlow).orderBy(desc(cashFlow.timestamp)),
      db.select().from(settings).limit(1),
    ]);

    // Parse JSON variants for products and normalize legacy image paths
    const parsedProducts = dbProducts.map((p) => ({
      ...p,
      imageUrl: p.imageUrl?.replace('/src/assets/images/', '/images/'),
      variants: typeof p.variants === 'string' ? JSON.parse(p.variants) : p.variants,
    }));

    const currentSettings = dbSettings[0] || INITIAL_SETTINGS;

    res.json({
      products: parsedProducts,
      customers: dbCustomers,
      sales: dbSales,
      debtTransactions: dbDebts,
      cashFlow: dbCashFlow,
      settings: currentSettings,
    });
  } catch (err: any) {
    console.error('Error in /api/bootstrap:', err);
    res.status(500).json({ error: 'Failed to load database state' });
  }
});

// 2. Products
app.get('/api/products', async (_req: Request, res: Response) => {
  try {
    const list = await db.select().from(products);
    const parsed = list.map((p) => ({
      ...p,
      imageUrl: p.imageUrl?.replace('/src/assets/images/', '/images/'),
      variants: typeof p.variants === 'string' ? JSON.parse(p.variants) : p.variants,
    }));
    res.json(parsed);
  } catch (err: any) {
    console.error('Error getting products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/products', async (req: Request, res: Response) => {
  try {
    const p = req.body;
    const variantsJson = p.variants ? JSON.stringify(p.variants) : null;

    const existing = await db.select().from(products).where(eq(products.id, p.id)).limit(1);
    if (existing.length > 0) {
      await db.update(products).set({
        name: p.name,
        category: p.category,
        price: p.price,
        costPrice: p.costPrice,
        stock: p.stock,
        minStock: p.minStock,
        unit: p.unit,
        portionSizeDescription: p.portionSizeDescription,
        variants: variantsJson,
        imageUrl: p.imageUrl,
        active: p.active,
      }).where(eq(products.id, p.id));
    } else {
      await db.insert(products).values({
        id: p.id || `prod_${Date.now()}`,
        name: p.name,
        category: p.category,
        price: p.price,
        costPrice: p.costPrice,
        stock: p.stock,
        minStock: p.minStock,
        unit: p.unit,
        portionSizeDescription: p.portionSizeDescription,
        variants: variantsJson,
        imageUrl: p.imageUrl,
        active: p.active ?? true,
      });
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error saving product:', err);
    res.status(500).json({ error: 'Failed to save product' });
  }
});

app.post('/api/products/replenish', async (req: Request, res: Response) => {
  try {
    const { productId, quantityToAdd } = req.body;
    const prod = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (prod.length > 0) {
      const newStock = prod[0].stock + quantityToAdd;
      await db.update(products).set({ stock: newStock }).where(eq(products.id, productId));
      res.json({ success: true, newStock });
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (err: any) {
    console.error('Error replenishing product:', err);
    res.status(500).json({ error: 'Failed to replenish product' });
  }
});

// 3. Customers
app.get('/api/customers', async (_req: Request, res: Response) => {
  try {
    const list = await db.select().from(customers);
    res.json(list);
  } catch (err: any) {
    console.error('Error getting customers:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

app.post('/api/customers', async (req: Request, res: Response) => {
  try {
    const c = req.body;
    const existing = await db.select().from(customers).where(eq(customers.id, c.id)).limit(1);
    if (existing.length > 0) {
      await db.update(customers).set({
        name: c.name,
        nickname: c.nickname,
        phone: c.phone,
        creditLimit: c.creditLimit,
        notes: c.notes,
      }).where(eq(customers.id, c.id));
      res.json({ success: true, customer: { ...existing[0], ...c } });
    } else {
      const newCust = {
        id: c.id || `cust_${Date.now()}`,
        name: c.name,
        nickname: c.nickname,
        phone: c.phone,
        creditLimit: c.creditLimit || 120,
        totalDebt: 0,
        notes: c.notes,
        createdAt: new Date().toISOString(),
      };
      await db.insert(customers).values(newCust);
      res.json({ success: true, customer: newCust });
    }
  } catch (err: any) {
    console.error('Error saving customer:', err);
    res.status(500).json({ error: 'Failed to save customer' });
  }
});

// 4. Sales & Fiado checkout
app.post('/api/sales', async (req: Request, res: Response) => {
  try {
    const { sale, cart, method, customerId } = req.body;

    // Insert sale record
    await db.insert(sales).values({
      id: sale.id,
      timestamp: sale.timestamp,
      items: JSON.stringify(sale.items),
      total: sale.total,
      paymentMethod: method,
      customerId: sale.customerId,
      customerName: sale.customerName,
      notes: sale.notes,
    });

    // Decrement product stock in PostgreSQL
    if (cart && Array.isArray(cart)) {
      for (const item of cart) {
        const prodId = item.product?.id || item.productId;
        const prod = await db.select().from(products).where(eq(products.id, prodId)).limit(1);
        if (prod.length > 0) {
          const updatedStock = Math.max(0, prod[0].stock - item.quantity);
          await db.update(products).set({ stock: updatedStock }).where(eq(products.id, prodId));
        }
      }
    }

    // If upfront payment, record in cash flow
    if (method !== 'fiado') {
      await db.insert(cashFlow).values({
        id: `cf_${Date.now()}`,
        timestamp: sale.timestamp,
        type: 'entrada',
        category: 'venda_vista',
        amount: sale.total,
        description: `Venda #${sale.id.slice(-4)} (${sale.items?.length || 1} itens)`,
        paymentMethod: method,
        referenceId: sale.id,
      });
    }

    // If fiado, update customer debt and record debt transaction
    if (method === 'fiado' && customerId) {
      const target = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
      if (target.length > 0) {
        const currentDebt = target[0].totalDebt || 0;
        const newTotalDebt = currentDebt + sale.total;
        await db.update(customers).set({
          totalDebt: newTotalDebt,
          lastPurchaseAt: sale.timestamp,
        }).where(eq(customers.id, customerId));

        const itemsSummary = (sale.items || [])
          .map((i: any) => `${i.quantity}x ${i.name}`)
          .join(', ');

        await db.insert(debtTransactions).values({
          id: `tx_${Date.now()}`,
          customerId: target[0].id,
          customerName: target[0].name,
          saleId: sale.id,
          type: 'compra',
          amount: sale.total,
          remainingDebtAfter: newTotalDebt,
          timestamp: sale.timestamp,
          paymentMethodUsed: 'fiado',
          description: `Compra no balcão: ${itemsSummary}`,
          itemsSummary,
        });
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error processing sale:', err);
    res.status(500).json({ error: 'Failed to record sale' });
  }
});

// 5. Debt Payment (Amortização / Quitação)
app.post('/api/debts/payment', async (req: Request, res: Response) => {
  try {
    const { customerId, amount, method, notes } = req.body;
    const target = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (target.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const currentDebt = target[0].totalDebt || 0;
    const remainingDebt = Math.max(0, currentDebt - amount);
    const now = new Date().toISOString();

    // Update customer debt
    await db.update(customers).set({ totalDebt: remainingDebt }).where(eq(customers.id, customerId));

    // Insert debt transaction
    const txId = `tx_${Date.now()}`;
    await db.insert(debtTransactions).values({
      id: txId,
      customerId: target[0].id,
      customerName: target[0].name,
      type: 'pagamento',
      amount,
      remainingDebtAfter: remainingDebt,
      timestamp: now,
      paymentMethodUsed: method,
      description: `Pagamento recebido via ${method.toUpperCase()}${notes ? ` (${notes})` : ''}`,
    });

    // Insert into Cash Flow as 'recebimento_fiado'
    await db.insert(cashFlow).values({
      id: `cf_${Date.now()}`,
      timestamp: now,
      type: 'entrada',
      category: 'recebimento_fiado',
      amount,
      description: `Recebimento de Fiado (${target[0].nickname || target[0].name})`,
      paymentMethod: method,
      referenceId: txId,
    });

    res.json({ success: true, remainingDebt });
  } catch (err: any) {
    console.error('Error receiving payment:', err);
    res.status(500).json({ error: 'Failed to receive payment' });
  }
});

// 6. Manual Debt
app.post('/api/debts/manual', async (req: Request, res: Response) => {
  try {
    const { customerId, amount, description } = req.body;
    const target = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (target.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const currentDebt = target[0].totalDebt || 0;
    const newDebt = currentDebt + amount;
    const now = new Date().toISOString();

    await db.update(customers).set({
      totalDebt: newDebt,
      lastPurchaseAt: now,
    }).where(eq(customers.id, customerId));

    await db.insert(debtTransactions).values({
      id: `tx_${Date.now()}`,
      customerId: target[0].id,
      customerName: target[0].name,
      type: 'compra',
      amount,
      remainingDebtAfter: newDebt,
      timestamp: now,
      paymentMethodUsed: 'fiado',
      description,
    });

    res.json({ success: true, newDebt });
  } catch (err: any) {
    console.error('Error adding manual debt:', err);
    res.status(500).json({ error: 'Failed to add manual debt' });
  }
});

// 7. Cash Flow
app.post('/api/cash-flow', async (req: Request, res: Response) => {
  try {
    const entry = req.body;
    await db.insert(cashFlow).values({
      id: entry.id || `cf_${Date.now()}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      type: entry.type,
      category: entry.category,
      amount: entry.amount,
      description: entry.description,
      paymentMethod: entry.paymentMethod,
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error recording cash flow:', err);
    res.status(500).json({ error: 'Failed to record cash flow' });
  }
});

// 8. Settings
app.post('/api/settings', async (req: Request, res: Response) => {
  try {
    const newSettings = req.body;
    const existing = await db.select().from(settings).limit(1);
    if (existing.length > 0) {
      await db.update(settings).set({
        storeName: newSettings.storeName,
        storeSubtitle: newSettings.storeSubtitle,
        ownerPixKey: newSettings.ownerPixKey,
        pixKeyType: newSettings.pixKeyType,
        ownerName: newSettings.ownerName,
        defaultCreditLimit: newSettings.defaultCreditLimit,
      }).where(eq(settings.id, existing[0].id));
    } else {
      await db.insert(settings).values({
        storeName: newSettings.storeName,
        storeSubtitle: newSettings.storeSubtitle,
        ownerPixKey: newSettings.ownerPixKey,
        pixKeyType: newSettings.pixKeyType,
        ownerName: newSettings.ownerName,
        defaultCreditLimit: newSettings.defaultCreditLimit,
      });
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// 9. Reset Demo Data
app.post('/api/reset-demo', async (_req: Request, res: Response) => {
  try {
    await db.delete(products);
    await db.delete(customers);
    await db.delete(sales);
    await db.delete(debtTransactions);
    await db.delete(cashFlow);
    await db.delete(settings);

    // Re-seed
    await seedDatabaseIfEmpty();
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error resetting demo data:', err);
    res.status(500).json({ error: 'Failed to reset demo data' });
  }
});

// ================= VITE DEV MIDDLEWARE =================

async function startServer() {
  await seedDatabaseIfEmpty();

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Espeto & Gelada backend server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
