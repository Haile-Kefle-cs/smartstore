const { db } = require('../services/jsonDatabase');
const reportService = require('../services/reportService');
const { getDateRange } = require('../utils/dateUtils');

const reportController = {
  // Sales report
  async getSalesReport(req, res, next) {
    try {
      const { range = 'this_month' } = req.query;
      const report = await reportService.getSalesReport(range);
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  },

  // Daily sales report
  async getDailySalesReport(req, res, next) {
    try {
      const sales = await db.readTable('sales');
      const today = new Date().toDateString();
      
      const dailySales = sales.filter(sale => 
        new Date(sale.createdAt).toDateString() === today
      );
      
      const hourlyBreakdown = {};
      dailySales.forEach(sale => {
        const hour = new Date(sale.createdAt).getHours();
        if (!hourlyBreakdown[hour]) {
          hourlyBreakdown[hour] = { count: 0, total: 0 };
        }
        hourlyBreakdown[hour].count++;
        hourlyBreakdown[hour].total += sale.total;
      });
      
      res.json({
        success: true,
        data: {
          total: dailySales.reduce((sum, sale) => sum + sale.total, 0),
          count: dailySales.length,
          hourlyBreakdown
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Weekly sales report
  async getWeeklySalesReport(req, res, next) {
    try {
      const sales = await db.readTable('sales');
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      
      const weeklySales = sales.filter(sale => 
        new Date(sale.createdAt) >= weekStart
      );
      
      const dailyBreakdown = {};
      for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + i);
        dailyBreakdown[day.toDateString()] = { count: 0, total: 0 };
      }
      
      weeklySales.forEach(sale => {
        const day = new Date(sale.createdAt).toDateString();
        if (dailyBreakdown[day]) {
          dailyBreakdown[day].count++;
          dailyBreakdown[day].total += sale.total;
        }
      });
      
      res.json({
        success: true,
        data: {
          total: weeklySales.reduce((sum, sale) => sum + sale.total, 0),
          count: weeklySales.length,
          dailyBreakdown
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Monthly sales report
  async getMonthlySalesReport(req, res, next) {
    try {
      const sales = await db.readTable('sales');
      const monthStart = new Date();
      monthStart.setDate(1);
      
      const monthlySales = sales.filter(sale => 
        new Date(sale.createdAt) >= monthStart
      );
      
      const weeklyBreakdown = {};
      for (let i = 0; i < 4; i++) {
        const week = new Date(monthStart);
        week.setDate(week.getDate() + (i * 7));
        weeklyBreakdown[`Week ${i + 1}`] = { count: 0, total: 0 };
      }
      
      monthlySales.forEach(sale => {
        const saleDate = new Date(sale.createdAt);
        const weekNumber = Math.floor((saleDate - monthStart) / (7 * 24 * 60 * 60 * 1000));
        const weekKey = `Week ${weekNumber + 1}`;
        if (weeklyBreakdown[weekKey]) {
          weeklyBreakdown[weekKey].count++;
          weeklyBreakdown[weekKey].total += sale.total;
        }
      });
      
      res.json({
        success: true,
        data: {
          total: monthlySales.reduce((sum, sale) => sum + sale.total, 0),
          count: monthlySales.length,
          weeklyBreakdown
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Sales by product
  async getSalesByProduct(req, res, next) {
    try {
      const sales = await db.readTable('sales');
      const products = await db.readTable('products');
      
      const productSales = {};
      
      sales.forEach(sale => {
        sale.items.forEach(item => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = {
              productId: item.productId,
              productName: item.productName,
              quantity: 0,
              revenue: 0,
              profit: 0
            };
          }
          productSales[item.productId].quantity += item.quantity;
          productSales[item.productId].revenue += item.quantity * item.price;
          productSales[item.productId].profit += item.quantity * (item.price - item.costPrice);
        });
      });
      
      const result = Object.values(productSales).sort((a, b) => b.revenue - a.revenue);
      
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  // Sales by category
  async getSalesByCategory(req, res, next) {
    try {
      const sales = await db.readTable('sales');
      const categories = await db.readTable('categories');
      const products = await db.readTable('products');
      
      const categorySales = {};
      
      sales.forEach(sale => {
        sale.items.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const categoryId = product.categoryId || 'uncategorized';
            if (!categorySales[categoryId]) {
              categorySales[categoryId] = {
                categoryId,
                categoryName: categories.find(c => c.id === categoryId)?.name || 'Uncategorized',
                quantity: 0,
                revenue: 0
              };
            }
            categorySales[categoryId].quantity += item.quantity;
            categorySales[categoryId].revenue += item.quantity * item.price;
          }
        });
      });
      
      const result = Object.values(categorySales).sort((a, b) => b.revenue - a.revenue);
      
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  // Sales by customer
  async getSalesByCustomer(req, res, next) {
    try {
      const sales = await db.readTable('sales');
      const customers = await db.readTable('customers');
      
      const customerSales = {};
      
      sales.forEach(sale => {
        const customerId = sale.customerId || 'walk-in';
        if (!customerSales[customerId]) {
          customerSales[customerId] = {
            customerId,
            customerName: customerId === 'walk-in' ? 'Walk-in Customer' : 
                          customers.find(c => c.id === customerId)?.name || 'Unknown',
            count: 0,
            total: 0
          };
        }
        customerSales[customerId].count++;
        customerSales[customerId].total += sale.total;
      });
      
      const result = Object.values(customerSales).sort((a, b) => b.total - a.total);
      
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  // Sales by payment method
  async getSalesByPaymentMethod(req, res, next) {
    try {
      const sales = await db.readTable('sales');
      
      const methodSales = {};
      
      sales.forEach(sale => {
        const method = sale.paymentMethod || 'unknown';
        if (!methodSales[method]) {
          methodSales[method] = { count: 0, total: 0 };
        }
        methodSales[method].count++;
        methodSales[method].total += sale.total;
      });
      
      res.json({ success: true, data: methodSales });
    } catch (error) {
      next(error);
    }
  },

  // Purchase report
  async getPurchaseReport(req, res, next) {
    try {
      const { range = 'this_month' } = req.query;
      const report = await reportService.getPurchaseReport(range);
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  },

  // Purchases by supplier
  async getPurchasesBySupplier(req, res, next) {
    try {
      const purchases = await db.readTable('purchases');
      const suppliers = await db.readTable('suppliers');
      
      const supplierPurchases = {};
      
      purchases.forEach(purchase => {
        const supplierId = purchase.supplierId;
        if (!supplierPurchases[supplierId]) {
          supplierPurchases[supplierId] = {
            supplierId,
            supplierName: suppliers.find(s => s.id === supplierId)?.companyName || 'Unknown',
            count: 0,
            total: 0
          };
        }
        supplierPurchases[supplierId].count++;
        supplierPurchases[supplierId].total += purchase.total;
      });
      
      const result = Object.values(supplierPurchases).sort((a, b) => b.total - a.total);
      
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  // Purchases by product
  async getPurchasesByProduct(req, res, next) {
    try {
      const purchases = await db.readTable('purchases');
      
      const productPurchases = {};
      
      purchases.forEach(purchase => {
        purchase.items.forEach(item => {
          if (!productPurchases[item.productId]) {
            productPurchases[item.productId] = {
              productId: item.productId,
              productName: item.productName,
              quantity: 0,
              total: 0
            };
          }
          productPurchases[item.productId].quantity += item.quantity;
          productPurchases[item.productId].total += item.quantity * item.costPrice;
        });
      });
      
      const result = Object.values(productPurchases).sort((a, b) => b.total - a.total);
      
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  // Expense report
  async getExpenseReport(req, res, next) {
    try {
      const { range = 'this_month' } = req.query;
      const report = await reportService.getExpenseReport(range);
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  },

  // Expenses by category
  async getExpensesByCategory(req, res, next) {
    try {
      const expenses = await db.readTable('expenses');
      
      const categoryExpenses = {};
      
      expenses.forEach(expense => {
        if (!categoryExpenses[expense.category]) {
          categoryExpenses[expense.category] = { count: 0, total: 0 };
        }
        categoryExpenses[expense.category].count++;
        categoryExpenses[expense.category].total += expense.amount;
      });
      
      res.json({ success: true, data: categoryExpenses });
    } catch (error) {
      next(error);
    }
  },

  // Monthly expense report
  async getMonthlyExpenseReport(req, res, next) {
    try {
      const expenses = await db.readTable('expenses');
      const monthStart = new Date();
      monthStart.setDate(1);
      
      const monthlyExpenses = expenses.filter(expense => 
        new Date(expense.date) >= monthStart
      );
      
      res.json({
        success: true,
        data: {
          total: monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0),
          count: monthlyExpenses.length,
          expenses: monthlyExpenses
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Inventory report
  async getInventoryReport(req, res, next) {
    try {
      const report = await reportService.getInventoryReport();
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  },

  // Inventory value report
  async getInventoryValueReport(req, res, next) {
    try {
      const products = await db.readTable('products');
      const value = products.reduce((sum, p) => sum + (p.quantity * p.costPrice), 0);
      res.json({ success: true, data: { value } });
    } catch (error) {
      next(error);
    }
  },

  // Inventory turnover report
  async getInventoryTurnoverReport(req, res, next) {
    try {
      const products = await db.readTable('products');
      const sales = await db.readTable('sales');
      
      const turnoverData = products.map(product => {
        const productSales = sales.filter(sale => 
          sale.items.some(item => item.productId === product.id)
        );
        const totalSold = productSales.reduce((sum, sale) => {
          const item = sale.items.find(i => i.productId === product.id);
          return sum + (item ? item.quantity : 0);
        }, 0);
        
        return {
          productId: product.id,
          productName: product.name,
          currentStock: product.quantity,
          totalSold,
          turnoverRate: product.quantity > 0 ? totalSold / product.quantity : 0
        };
      });
      
      res.json({ success: true, data: turnoverData });
    } catch (error) {
      next(error);
    }
  },

  // Inventory aging report
  async getInventoryAgingReport(req, res, next) {
    try {
      const products = await db.readTable('products');
      const movements = await db.readTable('stock-movements');
      
      const agingData = products.map(product => {
        const productMovements = movements.filter(m => m.productId === product.id);
        const lastMovement = productMovements.sort((a, b) => 
          new Date(b.date) - new Date(a.date)
        )[0];
        
        const daysSinceLastMovement = lastMovement ? 
          Math.floor((new Date() - new Date(lastMovement.date)) / (1000 * 60 * 60 * 24)) : 
          Math.floor((new Date() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24));
        
        return {
          productId: product.id,
          productName: product.name,
          quantity: product.quantity,
          daysSinceLastMovement,
          aging: daysSinceLastMovement > 90 ? 'old' : 
                 daysSinceLastMovement > 30 ? 'aging' : 'fresh'
        };
      });
      
      res.json({ success: true, data: agingData });
    } catch (error) {
      next(error);
    }
  },

  // Profit and loss report
  async getProfitLossReport(req, res, next) {
    try {
      const { range = 'this_month' } = req.query;
      const report = await reportService.getProfitLossReport(range);
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  },

  // Cash flow report
  async getCashFlowReport(req, res, next) {
    try {
      const { range = 'this_month' } = req.query;
      const { start, end } = getDateRange(range);
      
      const sales = await db.readTable('sales');
      const expenses = await db.readTable('expenses');
      const payments = await db.readTable('payments');
      
      const cashIn = sales
        .filter(s => new Date(s.createdAt) >= start && new Date(s.createdAt) <= end)
        .reduce((sum, s) => sum + s.total, 0);
      
      const cashOut = expenses
        .filter(e => new Date(e.date) >= start && new Date(e.date) <= end)
        .reduce((sum, e) => sum + e.amount, 0);
      
      res.json({
        success: true,
        data: {
          cashIn,
          cashOut,
          netCashFlow: cashIn - cashOut
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Tax report
  async getTaxReport(req, res, next) {
    try {
      const { range = 'this_month' } = req.query;
      const { start, end } = getDateRange(range);
      
      const sales = await db.readTable('sales');
      const filteredSales = sales.filter(s => 
        new Date(s.createdAt) >= start && new Date(s.createdAt) <= end
      );
      
      const taxCollected = filteredSales.reduce((sum, s) => sum + (s.tax || 0), 0);
      
      res.json({
        success: true,
        data: {
          taxCollected,
          taxableSales: filteredSales.reduce((sum, s) => sum + s.subtotal, 0),
          saleCount: filteredSales.length
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Customer report
  async getCustomerReport(req, res, next) {
    try {
      const customers = await db.readTable('customers');
      const sales = await db.readTable('sales');
      
      const customerData = customers.map(customer => {
        const customerSales = sales.filter(s => s.customerId === customer.id);
        return {
          customerId: customer.id,
          customerName: customer.name,
          email: customer.email,
          totalPurchases: customer.totalPurchases || 0,
          totalSpent: customer.totalSpent || 0,
          averageOrder: customer.totalPurchases > 0 ? 
            customer.totalSpent / customer.totalPurchases : 0
        };
      });
      
      res.json({ success: true, data: customerData });
    } catch (error) {
      next(error);
    }
  },

  // Loyalty report
  async getLoyaltyReport(req, res, next) {
    try {
      const customers = await db.readTable('customers');
      const loyalCustomers = customers
        .filter(c => (c.loyaltyPoints || 0) > 0)
        .sort((a, b) => (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0));
      
      res.json({ success: true, data: loyalCustomers });
    } catch (error) {
      next(error);
    }
  },

  // Customer retention report
  async getCustomerRetentionReport(req, res, next) {
    try {
      const customers = await db.readTable('customers');
      const sales = await db.readTable('sales');
      
      const retentionData = customers.map(customer => {
        const customerSales = sales.filter(s => s.customerId === customer.id);
        const sortedSales = customerSales.sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
        
        let repeatPurchases = 0;
        if (sortedSales.length > 1) {
          repeatPurchases = sortedSales.length - 1;
        }
        
        return {
          customerId: customer.id,
          customerName: customer.name,
          totalOrders: sortedSales.length,
          repeatPurchases,
          retentionRate: sortedSales.length > 0 ? 
            (repeatPurchases / sortedSales.length) * 100 : 0
        };
      });
      
      res.json({ success: true, data: retentionData });
    } catch (error) {
      next(error);
    }
  },

  // Sales performance report
  async getSalesPerformanceReport(req, res, next) {
    try {
      const sales = await db.readTable('sales');
      const users = await db.readTable('users');
      
      const performanceData = {};
      
      sales.forEach(sale => {
        const userId = sale.createdBy || 'unknown';
        if (!performanceData[userId]) {
          performanceData[userId] = {
            userId,
            userName: users.find(u => u.id === userId)?.name || 'Unknown',
            salesCount: 0,
            totalSales: 0
          };
        }
        performanceData[userId].salesCount++;
        performanceData[userId].totalSales += sale.total;
      });
      
      const result = Object.values(performanceData).sort((a, b) => b.totalSales - a.totalSales);
      
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  // Product performance report
  async getProductPerformanceReport(req, res, next) {
    try {
      const products = await db.readTable('products');
      const sales = await db.readTable('sales');
      
      const performanceData = products.map(product => {
        const productSales = sales.filter(sale => 
          sale.items.some(item => item.productId === product.id)
        );
        
        const totalQuantity = productSales.reduce((sum, sale) => {
          const item = sale.items.find(i => i.productId === product.id);
          return sum + (item ? item.quantity : 0);
        }, 0);
        
        const totalRevenue = productSales.reduce((sum, sale) => {
          const item = sale.items.find(i => i.productId === product.id);
          return sum + (item ? item.quantity * item.price : 0);
        }, 0);
        
        const totalProfit = productSales.reduce((sum, sale) => {
          const item = sale.items.find(i => i.productId === product.id);
          return sum + (item ? item.quantity * (item.price - item.costPrice) : 0);
        }, 0);
        
        return {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          totalQuantity,
          totalRevenue,
          totalProfit,
          profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
        };
      });
      
      res.json({ success: true, data: performanceData });
    } catch (error) {
      next(error);
    }
  },

  // Employee performance report
  async getEmployeePerformanceReport(req, res, next) {
    try {
      const users = await db.readTable('users');
      const sales = await db.readTable('sales');
      
      const performanceData = users.map(user => {
        const userSales = sales.filter(s => s.createdBy === user.id);
        return {
          userId: user.id,
          userName: user.name,
          role: user.role,
          salesCount: userSales.length,
          totalSales: userSales.reduce((sum, s) => sum + s.total, 0),
          averageSale: userSales.length > 0 ? 
            userSales.reduce((sum, s) => sum + s.total, 0) / userSales.length : 0
        };
      });
      
      res.json({ success: true, data: performanceData });
    } catch (error) {
      next(error);
    }
  },

  // Export functions (return JSON for download)
  async exportSalesReport(req, res, next) {
    try {
      const sales = await db.readTable('sales');
      res.json({ success: true, data: sales, format: 'json' });
    } catch (error) {
      next(error);
    }
  },

  async exportPurchaseReport(req, res, next) {
    try {
      const purchases = await db.readTable('purchases');
      res.json({ success: true, data: purchases, format: 'json' });
    } catch (error) {
      next(error);
    }
  },

  async exportExpenseReport(req, res, next) {
    try {
      const expenses = await db.readTable('expenses');
      res.json({ success: true, data: expenses, format: 'json' });
    } catch (error) {
      next(error);
    }
  },

  async exportInventoryReport(req, res, next) {
    try {
      const products = await db.readTable('products');
      res.json({ success: true, data: products, format: 'json' });
    } catch (error) {
      next(error);
    }
  },

  async exportProfitLossReport(req, res, next) {
    try {
      const report = await reportService.getProfitLossReport();
      res.json({ success: true, data: report, format: 'json' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = reportController;