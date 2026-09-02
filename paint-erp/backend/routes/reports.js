const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth, requireOwner } = require('../middleware/auth');
const { logAction } = require('../audit');
const { getSupabaseClient } = require('../supabaseSync');

// 1. GET /api/reports/dashboard-overview (Real-time store dashboard for Owner & Staff)
router.get('/dashboard-overview', requireAuth, async (req, res) => {
  try {
    const isOwner = req.user.system_role === 'Owner';
    const now = new Date();
    const currentMonthStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth();
    const todayStr = now.toISOString().slice(0, 10);

    const client = getSupabaseClient();
    if (client) {
      try {
        const [
          invsRes,
          itemsRes,
          expRes,
          prodRes,
          baseRes,
          pigRes,
          creditRes,
          supRes,
          auditRes
        ] = await Promise.all([
          client.from('invoices').select('*, store_users(full_name)').order('created_at', { ascending: false }),
          client.from('invoice_items').select('*'),
          client.from('expenses').select('*').order('created_at', { ascending: false }),
          client.from('products').select('*'),
          client.from('stock_base_tins').select('*'),
          client.from('stock_pigments').select('*'),
          client.from('credit_accounts').select('*'),
          client.from('suppliers').select('*'),
          client.from('audit_log').select('*, store_users(full_name, system_role)').order('timestamp', { ascending: false }).limit(6)
        ]);

        if (!invsRes.error && !itemsRes.error) {
          const invoices = invsRes.data || [];
          const items = itemsRes.data || [];
          const expenses = expRes.data || [];
          const products = prodRes.data || [];
          const baseTins = baseRes.data || [];
          const pigments = pigRes.data || [];
          const creditAccounts = creditRes.data || [];
          const suppliers = supRes.data || [];
          const auditLogs = auditRes.data || [];

          const itemsByInvoice = {};
          items.forEach(it => {
            if (!itemsByInvoice[it.invoice_id]) itemsByInvoice[it.invoice_id] = [];
            itemsByInvoice[it.invoice_id].push(it);
          });

          let salesThisMonth = 0;
          let ordersThisMonth = 0;
          let salesToday = 0;
          let ordersToday = 0;
          let cogsThisMonth = 0;

          const prodProfitMap = {};

          invoices.forEach(inv => {
            if (inv.status !== 'Paid') return;
            const invDate = new Date(inv.created_at || now);
            const isThisMonth = invDate.getUTCFullYear() === currentYear && invDate.getUTCMonth() === currentMonth;
            const isToday = (inv.created_at || '').slice(0, 10) === todayStr;

            const amt = Number(inv.total_kes) || 0;
            if (isThisMonth) {
              salesThisMonth += amt;
              ordersThisMonth++;
              const invItems = itemsByInvoice[inv.invoice_id] || [];
              invItems.forEach(it => {
                const itemQty = Number(it.quantity) || 1;
                const itemPrice = Number(it.unit_price_kes) || 0;
                const itemCost = Number(it.line_cost_kes) || 0;
                const lineCogs = itemCost * itemQty;
                cogsThisMonth += lineCogs;

                const name = it.description || 'Custom Paint / Hardware';
                if (!prodProfitMap[name]) {
                  prodProfitMap[name] = { name, units_sold: 0, revenue_kes: 0, profit_kes: 0 };
                }
                prodProfitMap[name].units_sold += itemQty;
                prodProfitMap[name].revenue_kes += itemPrice * itemQty;
                prodProfitMap[name].profit_kes += (itemPrice - itemCost) * itemQty;
              });
            }
            if (isToday) {
              salesToday += amt;
              ordersToday++;
            }
          });

          let expensesThisMonth = 0;
          expenses.forEach(exp => {
            const expDate = new Date(exp.created_at || now);
            if (expDate.getUTCFullYear() === currentYear && expDate.getUTCMonth() === currentMonth) {
              expensesThisMonth += Number(exp.amount_kes) || 0;
            }
          });

          const grossProfit = salesThisMonth - cogsThisMonth;
          const netProfit = grossProfit - expensesThisMonth;
          const netMarginPct = salesThisMonth > 0 ? (netProfit / salesThisMonth) * 100 : 0;

          // Stock valuation
          let totalCostWorth = 0;
          let totalRetailWorth = 0;
          products.forEach(p => {
            const qty = Number(p.quantity_in_stock) || 0;
            totalCostWorth += (Number(p.unit_cost_kes) || 0) * qty;
            totalRetailWorth += (Number(p.unit_price_kes) || 0) * qty;
          });
          baseTins.forEach(b => {
            const qty = Number(b.quantity_in_stock) || 0;
            const cost = Number(b.unit_cost_kes) || 0;
            totalCostWorth += cost * qty;
            totalRetailWorth += (cost * 1.45) * qty;
          });
          pigments.forEach(pig => {
            const qty = Number(pig.quantity_ml) || 0;
            const cost = (Number(pig.unit_cost_per_ml_kes) || 0) * qty;
            totalCostWorth += cost;
            totalRetailWorth += cost * 1.6;
          });
          const totalStockItems = products.length + baseTins.length + pigments.length;

          // Customer Credit
          const activeCreditAccs = creditAccounts.filter(c => (Number(c.current_balance_kes) || 0) > 0);
          const totalCreditDebt = activeCreditAccs.reduce((sum, c) => sum + (Number(c.current_balance_kes) || 0), 0);

          // Supplier Payables
          const activeSuppliers = suppliers.filter(s => (Number(s.current_balance_kes) || 0) > 0);
          const totalSupplierPayables = activeSuppliers.reduce((sum, s) => sum + (Number(s.current_balance_kes) || 0), 0);

          // Top products
          const topProducts = Object.values(prodProfitMap)
            .sort((a, b) => b.profit_kes - a.profit_kes)
            .slice(0, 5);

          // Low stock items
          const lowStockList = [];
          products.forEach(p => {
            if (p.quantity_in_stock <= p.low_stock_threshold) {
              lowStockList.push({ name: p.product_name, current_qty: p.quantity_in_stock, low_stock_threshold: p.low_stock_threshold, unit: 'piece', type: 'hardware' });
            }
          });
          baseTins.forEach(b => {
            if (b.quantity_in_stock <= b.low_stock_threshold) {
              lowStockList.push({ name: `${b.manufacturer || ''} ${b.base_name || ''} ${b.tin_size_litres || ''}L`, current_qty: b.quantity_in_stock, low_stock_threshold: b.low_stock_threshold, unit: 'tin', type: 'base' });
            }
          });
          pigments.forEach(pig => {
            if (pig.quantity_ml <= pig.low_stock_threshold_ml) {
              lowStockList.push({ name: `${pig.pigment_name} (${pig.pigment_code})`, current_qty: pig.quantity_ml, low_stock_threshold: pig.low_stock_threshold_ml, unit: 'ml', type: 'pigment' });
            }
          });
          lowStockList.sort((a, b) => a.current_qty - b.current_qty);

          // Recent Audit Logs
          const recentLogs = auditLogs.map(a => ({
            log_id: a.log_id,
            action: a.action,
            details: a.details,
            timestamp: a.timestamp,
            operator_name: (a.store_users && a.store_users.full_name) || (a.user_id === 1 ? 'Store Owner' : 'Shop Staff'),
            operator_role: (a.store_users && a.store_users.system_role) || (a.user_id === 1 ? 'Owner' : 'Cashier')
          }));

          return res.json({
            month_label: currentMonthStr,
            is_owner: isOwner,
            sales_this_month_kes: salesThisMonth,
            orders_count_this_month: ordersThisMonth,
            sales_today_kes: salesToday,
            orders_count_today: ordersToday,
            cogs_this_month_kes: cogsThisMonth,
            expenses_this_month_kes: expensesThisMonth,
            gross_profit_this_month_kes: grossProfit,
            net_profit_this_month_kes: netProfit,
            net_margin_pct: Number(netMarginPct.toFixed(1)),
            stock_valuation: {
              total_items_tracked: totalStockItems,
              total_cost_worth_kes: Math.round(totalCostWorth),
              total_retail_worth_kes: Math.round(totalRetailWorth),
              potential_profit_kes: Math.round(totalRetailWorth - totalCostWorth)
            },
            customer_credit: {
              total_debt_kes: totalCreditDebt,
              debtors_count: activeCreditAccs.length
            },
            supplier_payables: {
              total_payable_kes: totalSupplierPayables,
              suppliers_count: activeSuppliers.length
            },
            cash_accounts: [
              { account_id: 1, account_name: 'Main Cash Drawer', account_type: 'Cash Drawer', balance_kes: 0 },
              { account_id: 2, account_name: 'M-Pesa Buy Goods Till', account_type: 'M-Pesa Till', balance_kes: salesThisMonth }
            ],
            top_products: topProducts,
            low_stock_items: lowStockList.slice(0, 6),
            recent_audit_logs: recentLogs
          });
        }
      } catch (sbErr) {
        console.error('Supabase dashboard overview error, falling back to SQLite:', sbErr.message);
      }
    }

    // 1. Sales - This Month
    const salesThisMonth = db.prepare(`
      SELECT COALESCE(SUM(total_kes), 0) AS revenue_kes, COUNT(*) AS orders_count
      FROM invoices
      WHERE status = 'Paid' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get();

    // 2. Sales - Today
    const salesToday = db.prepare(`
      SELECT COALESCE(SUM(total_kes), 0) AS revenue_kes, COUNT(*) AS orders_count
      FROM invoices
      WHERE status = 'Paid' AND date(created_at) = date('now')
    `).get();

    // 3. COGS & Margins This Month
    const cogsThisMonth = db.prepare(`
      SELECT COALESCE(SUM(ii.line_cost_kes * ii.quantity), 0) AS cogs_kes
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.invoice_id
      WHERE i.status = 'Paid' AND strftime('%Y-%m', i.created_at) = strftime('%Y-%m', 'now')
    `).get();

    // 4. Expenses This Month
    const expensesThisMonth = db.prepare(`
      SELECT COALESCE(SUM(amount_kes), 0) AS opex_kes, COUNT(*) AS count
      FROM expenses
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get();

    const grossProfit = salesThisMonth.revenue_kes - cogsThisMonth.cogs_kes;
    const netProfit = grossProfit - expensesThisMonth.opex_kes;
    const netMarginPct = salesThisMonth.revenue_kes > 0 ? (netProfit / salesThisMonth.revenue_kes) * 100 : 0;

    // 5. Stock Inventory Valuation
    const productValuation = db.prepare(`
      SELECT
        COUNT(*) AS total_products,
        COALESCE(SUM(quantity_in_stock), 0) AS total_qty_units,
        COALESCE(SUM(unit_cost_kes * quantity_in_stock), 0) AS cost_worth_kes,
        COALESCE(SUM(unit_price_kes * quantity_in_stock), 0) AS retail_worth_kes
      FROM products
    `).get();

    const baseTinsValuation = db.prepare(`
      SELECT
        COUNT(*) AS total_bases,
        COALESCE(SUM(quantity_in_stock), 0) AS total_tins,
        COALESCE(SUM(unit_cost_kes * quantity_in_stock), 0) AS cost_worth_kes,
        COALESCE(SUM((unit_cost_kes * 1.45) * quantity_in_stock), 0) AS retail_worth_kes
      FROM stock_base_tins
    `).get();

    const pigmentValuation = db.prepare(`
      SELECT
        COUNT(*) AS total_pigments,
        COALESCE(SUM(quantity_ml), 0) AS total_ml,
        COALESCE(SUM(unit_cost_per_ml_kes * quantity_ml), 0) AS cost_worth_kes
      FROM stock_pigments
    `).get();

    const totalStockCostWorth = (productValuation.cost_worth_kes || 0) + (baseTinsValuation.cost_worth_kes || 0) + (pigmentValuation.cost_worth_kes || 0);
    const totalStockRetailWorth = (productValuation.retail_worth_kes || 0) + (baseTinsValuation.retail_worth_kes || 0) + ((pigmentValuation.cost_worth_kes || 0) * 1.6);
    const totalStockItems = (productValuation.total_products || 0) + (baseTinsValuation.total_bases || 0) + (pigmentValuation.total_pigments || 0);

    // 6. Customer Credit & Debt
    const creditDebt = db.prepare(`
      SELECT COALESCE(SUM(current_balance_kes), 0) AS total_debt_kes, COUNT(*) AS debtors_count
      FROM credit_accounts WHERE current_balance_kes > 0
    `).get();

    // 7. Supplier Balances Owed
    const supplierPayables = db.prepare(`
      SELECT COALESCE(SUM(current_balance_kes), 0) AS total_payable_kes, COUNT(*) AS suppliers_count
      FROM suppliers WHERE current_balance_kes > 0
    `).get();

    // 8. Cashflow Accounts
    const cashAccounts = db.prepare(`
      SELECT account_id, account_name, account_type, balance_kes
      FROM cashflow_accounts
      ORDER BY account_id ASC
    `).all();

    // 9. Top 5 Profitable Products
    const topProducts = db.prepare(`
      SELECT 
        ii.description AS name,
        SUM(ii.quantity) AS units_sold,
        SUM(ii.unit_price_kes * ii.quantity) AS revenue_kes,
        SUM((ii.unit_price_kes - ii.line_cost_kes) * ii.quantity) AS profit_kes
      FROM invoice_items ii
      JOIN invoices i ON i.invoice_id = ii.invoice_id
      WHERE i.status = 'Paid' AND strftime('%Y-%m', i.created_at) = strftime('%Y-%m', 'now')
      GROUP BY ii.description
      ORDER BY profit_kes DESC
      LIMIT 5
    `).all();

    // 10. Low Stock Items (top 6 depleted)
    const lowStockItems = db.prepare(`
      SELECT product_name AS name, quantity_in_stock AS current_qty, low_stock_threshold, 'piece' AS unit, 'hardware' AS type
      FROM products WHERE quantity_in_stock <= low_stock_threshold
      UNION ALL
      SELECT (manufacturer || ' ' || base_name || ' ' || tin_size_litres || 'L') AS name, quantity_in_stock AS current_qty, low_stock_threshold, 'tin' AS unit, 'base' AS type
      FROM stock_base_tins WHERE quantity_in_stock <= low_stock_threshold
      UNION ALL
      SELECT (pigment_name || ' (' || pigment_code || ')') AS name, quantity_ml AS current_qty, low_stock_threshold_ml AS low_stock_threshold, 'ml' AS unit, 'pigment' AS type
      FROM stock_pigments WHERE quantity_ml <= low_stock_threshold_ml
      ORDER BY current_qty ASC LIMIT 6
    `).all();

    // 11. Latest 6 Audit Events
    const recentAuditLogs = db.prepare(`
      SELECT a.log_id, a.action, a.details, a.timestamp, u.full_name AS operator_name, u.system_role AS operator_role
      FROM audit_log a
      LEFT JOIN store_users u ON u.user_id = a.user_id
      ORDER BY a.log_id DESC LIMIT 6
    `).all();

    res.json({
      month_label: currentMonthStr,
      is_owner: isOwner,
      sales_this_month_kes: salesThisMonth.revenue_kes,
      orders_count_this_month: salesThisMonth.orders_count,
      sales_today_kes: salesToday.revenue_kes,
      orders_count_today: salesToday.orders_count,
      cogs_this_month_kes: cogsThisMonth.cogs_kes,
      expenses_this_month_kes: expensesThisMonth.opex_kes,
      gross_profit_this_month_kes: grossProfit,
      net_profit_this_month_kes: netProfit,
      net_margin_pct: Number(netMarginPct.toFixed(1)),
      stock_valuation: {
        total_items_tracked: totalStockItems,
        total_cost_worth_kes: Math.round(totalStockCostWorth),
        total_retail_worth_kes: Math.round(totalStockRetailWorth),
        potential_profit_kes: Math.round(totalStockRetailWorth - totalStockCostWorth)
      },
      customer_credit: {
        total_debt_kes: creditDebt.total_debt_kes,
        debtors_count: creditDebt.debtors_count
      },
      supplier_payables: {
        total_payable_kes: supplierPayables.total_payable_kes,
        suppliers_count: supplierPayables.suppliers_count
      },
      cash_accounts: cashAccounts,
      top_products: topProducts,
      low_stock_items: lowStockItems,
      recent_audit_logs: recentAuditLogs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/reports/sales - Staff see their sales, Owner sees all (with itemized breakdown)
router.get('/sales', requireAuth, async (req, res) => {
  try {
    const client = getSupabaseClient();
    if (client) {
      try {
        let invQuery = client.from('invoices').select('*, store_users(full_name)').order('created_at', { ascending: false }).limit(300);
        if (req.user.system_role !== 'Owner') {
          invQuery = invQuery.eq('created_by', req.user.user_id);
        }

        const [invsRes, itemsRes] = await Promise.all([
          invQuery,
          client.from('invoice_items').select('*')
        ]);

        if (!invsRes.error && !itemsRes.error) {
          const invoices = invsRes.data || [];
          const items = itemsRes.data || [];

          const itemsByInvoice = {};
          items.forEach(it => {
            if (!itemsByInvoice[it.invoice_id]) itemsByInvoice[it.invoice_id] = [];
            itemsByInvoice[it.invoice_id].push({
              ...it,
              line_total: (Number(it.quantity) || 1) * (Number(it.unit_price_kes) || 0)
            });
          });

          const result = invoices.map(inv => ({
            ...inv,
            total_amount_kes: inv.total_kes,
            served_by: (inv.store_users && inv.store_users.full_name) || (inv.created_by === 1 ? 'Store Owner' : 'Shop Staff'),
            invoice_number: `INV-2026-${String(inv.invoice_id).padStart(4, '0')}`,
            items: itemsByInvoice[inv.invoice_id] || []
          }));

          return res.json(result);
        }
      } catch (sbErr) {
        console.error('Supabase sales error, falling back to SQLite:', sbErr.message);
      }
    }

    let invoices;
    if (req.user.system_role === 'Owner') {
      invoices = db.prepare(`
        SELECT i.invoice_id, i.total_kes, i.total_kes AS total_amount_kes,
               i.payment_method, i.status, i.created_at, i.customer_phone,
               u.full_name AS served_by
        FROM invoices i
        JOIN store_users u ON u.user_id = i.created_by
        ORDER BY i.created_at DESC LIMIT 300
      `).all();
    } else {
      invoices = db.prepare(`
        SELECT i.invoice_id, i.total_kes, i.total_kes AS total_amount_kes,
               i.payment_method, i.status, i.created_at, i.customer_phone,
               u.full_name AS served_by
        FROM invoices i
        JOIN store_users u ON u.user_id = i.created_by
        WHERE i.created_by = ?
        ORDER BY i.created_at DESC LIMIT 300
      `).all(req.user.user_id);
    }

    // Attach items to each invoice
    const getItemStmt = db.prepare(`
      SELECT ii.*, p.sku AS product_sku
      FROM invoice_items ii
      LEFT JOIN products p ON p.product_id = ii.product_id
      WHERE ii.invoice_id = ?
    `);

    const result = invoices.map((inv) => {
      const items = getItemStmt.all(inv.invoice_id);
      return {
        ...inv,
        invoice_number: `INV-2026-${String(inv.invoice_id).padStart(4, '0')}`,
        items: items.map(i => ({
          ...i,
          line_total: Number(i.quantity) * Number(i.unit_price_kes)
        }))
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/reports/center-overview (Owner only) - Complete Analytical Reports Center
router.get('/center-overview', requireAuth, requireOwner, (req, res) => {
  try {
    const period = req.query.period || 'this_month'; // 'this_month' | 'last_month' | 'all_time'

    let invoiceDateFilter = '';
    let expenseDateFilter = '';
    let monthLabel = 'This Month';

    const now = new Date();
    const currentMonthStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (period === 'this_month') {
      invoiceDateFilter = "AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')";
      expenseDateFilter = "WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')";
      monthLabel = currentMonthStr;
    } else if (period === 'last_month') {
      invoiceDateFilter = "AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', '-1 month')";
      expenseDateFilter = "WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', '-1 month')";
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      monthLabel = lastMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      invoiceDateFilter = '';
      expenseDateFilter = '';
      monthLabel = 'All Time';
    }

    // 1. Sales & Revenue
    const revRow = db.prepare(`
      SELECT COALESCE(SUM(total_kes), 0) AS total_revenue_kes, COUNT(*) AS paid_orders_count
      FROM invoices
      WHERE status = 'Paid' ${invoiceDateFilter}
    `).get();

    const paymentMethods = db.prepare(`
      SELECT payment_method, COUNT(*) AS count, COALESCE(SUM(total_kes), 0) AS total_kes
      FROM invoices
      WHERE status = 'Paid' ${invoiceDateFilter}
      GROUP BY payment_method
    `).all();

    const cogsRow = db.prepare(`
      SELECT COALESCE(SUM(ii.line_cost_kes * ii.quantity), 0) AS total_cogs_kes
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.invoice_id
      WHERE i.status = 'Paid' ${invoiceDateFilter.replace(/created_at/g, 'i.created_at')}
    `).get();

    // 2. Expenses
    const opexRow = db.prepare(`
      SELECT COALESCE(SUM(amount_kes), 0) AS total_opex_kes, COUNT(*) AS expense_count
      FROM expenses
      ${expenseDateFilter}
    `).get();

    const expenseCategories = db.prepare(`
      SELECT category, SUM(amount_kes) AS total_kes, COUNT(*) AS count
      FROM expenses
      ${expenseDateFilter}
      GROUP BY category
      ORDER BY total_kes DESC
    `).all();

    // 3. Profits
    const totalRevenue = revRow.total_revenue_kes;
    const totalCogs = cogsRow.total_cogs_kes;
    const grossProfit = totalRevenue - totalCogs;
    const totalOpex = opexRow.total_opex_kes;
    const netProfit = grossProfit - totalOpex;

    const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // 4. Product Profitability Ranking
    const productProfitability = db.prepare(`
      SELECT 
        ii.description AS name,
        SUM(ii.quantity) AS units_sold,
        SUM(ii.unit_price_kes * ii.quantity) AS revenue_kes,
        SUM(ii.line_cost_kes * ii.quantity) AS cogs_kes,
        SUM((ii.unit_price_kes - ii.line_cost_kes) * ii.quantity) AS profit_kes
      FROM invoice_items ii
      JOIN invoices i ON i.invoice_id = ii.invoice_id
      WHERE i.status = 'Paid' ${invoiceDateFilter.replace(/created_at/g, 'i.created_at')}
      GROUP BY ii.description
      ORDER BY profit_kes DESC
      LIMIT 10
    `).all();

    // 5. Low Stock Alert Items (Consolidated List)
    const lowStockItems = db.prepare(`
      SELECT 
        product_name AS name,
        quantity_in_stock AS current_qty,
        low_stock_threshold,
        'piece' AS unit
      FROM products
      WHERE quantity_in_stock <= low_stock_threshold
      UNION ALL
      SELECT
        (manufacturer || ' ' || base_name || ' ' || tin_size_litres || 'L') AS name,
        quantity_in_stock AS current_qty,
        low_stock_threshold,
        'tin' AS unit
      FROM stock_base_tins
      WHERE quantity_in_stock <= low_stock_threshold
      UNION ALL
      SELECT
        (pigment_name || ' (' || pigment_code || ')') AS name,
        quantity_ml AS current_qty,
        low_stock_threshold_ml AS low_stock_threshold,
        'ml' AS unit
      FROM stock_pigments
      WHERE quantity_ml <= low_stock_threshold_ml
      ORDER BY current_qty ASC
      LIMIT 15
    `).all();

    // 6. Stock Valuation (Cost vs Retail Value)
    const productValuation = db.prepare(`
      SELECT
        COUNT(*) AS total_items,
        COALESCE(SUM(quantity_in_stock), 0) AS total_qty_units,
        COALESCE(SUM(unit_cost_kes * quantity_in_stock), 0) AS total_cost_worth_kes,
        COALESCE(SUM(unit_price_kes * quantity_in_stock), 0) AS total_retail_worth_kes
      FROM products
    `).get();

    const baseTinsValuation = db.prepare(`
      SELECT
        COUNT(*) AS total_bases,
        COALESCE(SUM(quantity_in_stock), 0) AS total_tins,
        COALESCE(SUM(unit_cost_kes * quantity_in_stock), 0) AS total_cost_worth_kes,
        COALESCE(SUM((unit_cost_kes * 1.45) * quantity_in_stock), 0) AS total_est_retail_worth_kes
      FROM stock_base_tins
    `).get();

    const pigmentValuation = db.prepare(`
      SELECT
        COUNT(*) AS total_pigments,
        COALESCE(SUM(quantity_ml), 0) AS total_ml,
        COALESCE(SUM(unit_cost_per_ml_kes * quantity_ml), 0) AS total_cost_worth_kes
      FROM stock_pigments
    `).get();

    const totalStockCostWorth = (productValuation.total_cost_worth_kes || 0) + (baseTinsValuation.total_cost_worth_kes || 0) + (pigmentValuation.total_cost_worth_kes || 0);
    const totalStockRetailWorth = (productValuation.total_retail_worth_kes || 0) + (baseTinsValuation.total_est_retail_worth_kes || 0) + ((pigmentValuation.total_cost_worth_kes || 0) * 1.6);
    const stockPotentialProfit = totalStockRetailWorth - totalStockCostWorth;

    // 7. Customer Credit / Debt
    const creditAccounts = db.prepare(`
      SELECT account_id, fundi_name, phone_number, credit_limit_kes, current_balance_kes
      FROM credit_accounts
      WHERE current_balance_kes > 0
      ORDER BY current_balance_kes DESC
    `).all();

    const totalCreditBalance = creditAccounts.reduce((sum, c) => sum + (c.current_balance_kes || 0), 0);
    const totalCreditLimit = creditAccounts.reduce((sum, c) => sum + (c.credit_limit_kes || 0), 0);

    res.json({
      period,
      month_label: monthLabel,
      sales: {
        total_revenue_kes: totalRevenue,
        paid_orders_count: revRow.paid_orders_count,
        payment_methods: paymentMethods
      },
      profits: {
        total_revenue_kes: totalRevenue,
        total_cogs_kes: totalCogs,
        gross_profit_kes: grossProfit,
        gross_margin_pct: Number(grossMarginPct.toFixed(1)),
        total_opex_kes: totalOpex,
        net_profit_kes: netProfit,
        net_margin_pct: Number(netMarginPct.toFixed(1)),
        expense_categories: expenseCategories
      },
      product_profitability: productProfitability,
      low_stock_items: lowStockItems,
      stock: {
        total_stock_cost_worth_kes: Math.round(totalStockCostWorth),
        total_stock_retail_worth_kes: Math.round(totalStockRetailWorth),
        stock_potential_profit_kes: Math.round(stockPotentialProfit)
      },
      credit: {
        total_outstanding_debt_kes: totalCreditBalance,
        total_credit_limit_kes: totalCreditLimit,
        debtors_count: creditAccounts.length
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /api/reports/credit (Owner only) - Customer Credit list
router.get('/credit', requireAuth, requireOwner, async (req, res) => {
  try {
    const client = getSupabaseClient();
    if (client) {
      const { data: accounts, error } = await client
        .from('credit_accounts')
        .select('*')
        .order('current_balance_kes', { ascending: false });

      if (!error && accounts) {
        return res.json(accounts);
      }
    }

    const accounts = db.prepare(`
      SELECT ca.*,
        (SELECT COUNT(*) FROM credit_transactions ct WHERE ct.account_id = ca.account_id) AS transaction_count,
        (SELECT MAX(created_at) FROM credit_transactions ct WHERE ct.account_id = ca.account_id) AS last_tx_date
      FROM credit_accounts ca
      ORDER BY ca.current_balance_kes DESC, ca.fundi_name ASC
    `).all();
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. POST /api/reports/credit/account (Owner only) - Add new customer credit account
router.post('/credit/account', requireAuth, requireOwner, (req, res) => {
  const { fundi_name, phone_number, credit_limit_kes, initial_debt_kes = 0 } = req.body;
  if (!fundi_name || !phone_number || credit_limit_kes === undefined) {
    return res.status(400).json({ error: 'Customer name, phone number, and credit limit are required.' });
  }

  const cleanPhone = phone_number.trim();
  const existing = db.prepare('SELECT * FROM credit_accounts WHERE phone_number = ?').get(cleanPhone);
  if (existing) {
    return res.status(409).json({ error: `Account with phone ${cleanPhone} already exists (${existing.fundi_name}).` });
  }

  const initDebt = Number(initial_debt_kes) || 0;
  const result = db.prepare(`
    INSERT INTO credit_accounts (fundi_name, phone_number, credit_limit_kes, current_balance_kes, approved_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(fundi_name.trim(), cleanPhone, Number(credit_limit_kes), initDebt, req.user.user_id);

  const accountId = result.lastInsertRowid;

  if (initDebt > 0) {
    db.prepare(`
      INSERT INTO credit_transactions (account_id, invoice_id, amount_kes, tx_type)
      VALUES (?, NULL, ?, 'Charge')
    `).run(accountId, initDebt);
  }

  logAction({
    userId: req.user.user_id,
    deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
    action: 'CREDIT_ACCOUNT_CREATED',
    details: `Created customer credit account for ${fundi_name} (${cleanPhone}), Limit: KES ${credit_limit_kes}, Initial Balance: KES ${initDebt}`,
    status: 'ALLOWED'
  });

  res.json({ account_id: accountId, ok: true, message: `Customer credit account created for ${fundi_name}!` });
});

// 5. POST /api/reports/credit/payment (Owner only) - Clear Debt (Max Full Balance or Custom Top-Up Amount)
router.post('/credit/payment', requireAuth, requireOwner, (req, res) => {
  const { account_id, amount_kes, cashflow_account_id, payment_method = 'Cash', notes } = req.body;
  if (!account_id || !amount_kes || Number(amount_kes) <= 0) {
    return res.status(400).json({ error: 'Account ID and a valid positive repayment amount are required.' });
  }

  const account = db.prepare('SELECT * FROM credit_accounts WHERE account_id = ?').get(account_id);
  if (!account) return res.status(404).json({ error: 'Customer credit account not found.' });

  const payAmt = Number(amount_kes);
  const currentBal = Number(account.current_balance_kes || 0);
  const newBalance = Math.max(0, currentBal - payAmt);

  const cfAccId = cashflow_account_id ? Number(cashflow_account_id) : 1; // Default to Cash Drawer
  const cashflowAcc = db.prepare('SELECT * FROM cashflow_accounts WHERE account_id = ?').get(cfAccId);

  const processPayment = db.transaction(() => {
    // 1. Insert credit transaction
    db.prepare(`
      INSERT INTO credit_transactions (account_id, invoice_id, amount_kes, tx_type)
      VALUES (?, NULL, ?, 'Payment')
    `).run(account_id, payAmt);

    // 2. Update credit balance
    db.prepare('UPDATE credit_accounts SET current_balance_kes = ? WHERE account_id = ?')
      .run(newBalance, account_id);

    // 3. Deposit money into Cashflow Account (Real-time Cashbook integration!)
    if (cashflowAcc) {
      db.prepare(`
        UPDATE cashflow_accounts
        SET balance_kes = balance_kes + ?, updated_at = CURRENT_TIMESTAMP
        WHERE account_id = ?
      `).run(payAmt, cfAccId);
    }

    // 4. Log in audit
    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'CREDIT_PAYMENT_RECORDED',
      details: `Received KES ${payAmt} debt repayment from ${account.fundi_name}. Prev: KES ${currentBal}, New: KES ${newBalance}. Deposited to: ${cashflowAcc ? cashflowAcc.account_name : payment_method}`,
      status: 'ALLOWED'
    });
  });

  try {
    processPayment();
    res.json({
      ok: true,
      account_id,
      customer_name: account.fundi_name,
      amount_paid_kes: payAmt,
      previous_balance_kes: currentBal,
      new_balance_kes: newBalance,
      message: `Recorded KES ${payAmt.toLocaleString()} debt payment from ${account.fundi_name}. Remaining debt: KES ${newBalance.toLocaleString()}.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. GET /api/reports/credit/:id/statement (Owner only) - Customer debt transactions statement
router.get('/credit/:id/statement', requireAuth, requireOwner, (req, res) => {
  const accountId = Number(req.params.id);
  const account = db.prepare('SELECT * FROM credit_accounts WHERE account_id = ?').get(accountId);
  if (!account) return res.status(404).json({ error: 'Customer account not found.' });

  const transactions = db.prepare(`
    SELECT ct.*, i.customer_phone, i.total_kes AS invoice_total
    FROM credit_transactions ct
    LEFT JOIN invoices i ON i.invoice_id = ct.invoice_id
    WHERE ct.account_id = ?
    ORDER BY ct.created_at DESC
  `).all(accountId);

  res.json({
    account,
    transactions
  });
});

// 7. GET /api/reports/credit/lookup?phone=XXX
router.get('/credit/lookup', requireAuth, (req, res) => {
  const phone = (req.query.phone || '').trim();
  if (!phone) return res.json(null);
  const acc = db.prepare('SELECT * FROM credit_accounts WHERE phone_number = ?').get(phone);
  res.json(acc || null);
});


// POST /api/reports/system-reset - Complete Store Factory Reset & Clean Slate
router.post('/system-reset', requireAuth, (req, res) => {
  const { pin, reset_scope = 'all', reason } = req.body;
  const { verifySecurityPin } = require('../middleware/auth');

  const check = verifySecurityPin(pin, 'SYSTEM_RESET', req.user);
  if (!check.valid) {
    return res.status(403).json({ error: check.error });
  }

  try {
    const resetTx = db.transaction(() => {
      if (reset_scope === 'all' || reset_scope === 'factory' || reset_scope === 'transactions') {
        // Clear all operational transactions
        db.prepare('DELETE FROM invoice_items').run();
        db.prepare('DELETE FROM mpesa_payments').run();
        db.prepare('DELETE FROM invoices').run();
        db.prepare('DELETE FROM expenses').run();
        db.prepare('DELETE FROM quotations').run();
        db.prepare('DELETE FROM credit_transactions').run();
        db.prepare('UPDATE credit_accounts SET current_balance_kes = 0').run();
        db.prepare('DELETE FROM supplier_transactions').run();
        db.prepare('UPDATE suppliers SET current_balance_kes = 0').run();

        // Reset default treasury balances
        db.prepare("UPDATE cashflow_accounts SET balance_kes = 50000 WHERE account_type = 'Cash Drawer'").run();
        db.prepare("UPDATE cashflow_accounts SET balance_kes = 120000 WHERE account_type = 'M-Pesa Till'").run();
        db.prepare("UPDATE cashflow_accounts SET balance_kes = 350000 WHERE account_type = 'Bank Account'").run();
      }

      if (reset_scope === 'sales_only') {
        db.prepare('DELETE FROM invoice_items').run();
        db.prepare('DELETE FROM mpesa_payments').run();
        db.prepare('DELETE FROM invoices').run();
      }

      if (reset_scope === 'expenses_only') {
        db.prepare('DELETE FROM expenses').run();
      }
    });

    resetTx();

    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'SYSTEM_RESET_EXECUTED',
      details: `Store system reset (${reset_scope}) executed by ${check.authorizedBy} (${req.user.system_role}). Reason: ${reason || 'Client initial launch / Fresh start'}`,
      status: 'ALLOWED'
    });

    res.json({
      ok: true,
      message: 'Store system reset successfully completed! All demo transactions cleared and clean balances restored.',
      reset_scope
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// DELETE /api/reports/credit/:id - Delete single customer credit account with PIN
router.delete('/credit/:id', requireAuth, (req, res) => {
  const accountId = Number(req.params.id);
  const { pin, reason } = req.body || {};
  const { verifySecurityPin } = require('../middleware/auth');

  const authCheck = verifySecurityPin(pin, 'DELETE_CREDIT_ACCOUNT', req.user);
  if (!authCheck.valid) {
    return res.status(403).json({ error: authCheck.error || 'Invalid Security PIN' });
  }

  const account = db.prepare('SELECT * FROM credit_accounts WHERE account_id = ?').get(accountId);
  if (!account) return res.status(404).json({ error: 'Customer credit account not found.' });

  try {
    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM credit_transactions WHERE account_id = ?').run(accountId);
      db.prepare('DELETE FROM credit_accounts WHERE account_id = ?').run(accountId);
    });
    deleteTx();

    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'CREDIT_ACCOUNT_DELETED',
      details: `Deleted credit account for ${account.fundi_name} (${account.phone_number}, Debt: KES ${account.current_balance_kes}) by ${authCheck.authorizedBy}. Reason: ${reason || 'Manual deletion'}`,
      status: 'ALLOWED'
    });

    res.json({ ok: true, message: `Customer credit account for "${account.fundi_name}" deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/credit/clear-all - Delete all customer credit accounts with PIN
router.post('/credit/clear-all', requireAuth, (req, res) => {
  const { pin, reason } = req.body || {};
  const { verifySecurityPin } = require('../middleware/auth');

  const authCheck = verifySecurityPin(pin, 'CLEAR_CREDIT_ACCOUNTS', req.user);
  if (!authCheck.valid) {
    return res.status(403).json({ error: authCheck.error || 'Invalid Security PIN' });
  }

  try {
    const count = db.prepare('SELECT COUNT(*) AS count FROM credit_accounts').get().count;
    const clearTx = db.transaction(() => {
      db.prepare('DELETE FROM credit_transactions').run();
      db.prepare('DELETE FROM credit_accounts').run();
    });
    clearTx();

    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'ALL_CREDIT_ACCOUNTS_CLEARED',
      details: `Cleared all ${count} customer credit accounts and debt ledgers by ${authCheck.authorizedBy}. Reason: ${reason || 'Bulk reset'}`,
      status: 'ALLOWED'
    });

    res.json({ ok: true, message: `Successfully cleared all ${count} customer credit accounts.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


