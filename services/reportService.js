const { db } = require('./jsonDatabase');
const { getDateRange } = require('../utils/dateUtils');
const { calculateTotal } = require('../utils/calculations');

const reportService = {
  async getSalesReport(dateRange = 'this_month') {
    const { start, end } = getDateRange(dateRange);
    const sales = await db.readTable('sales');
    
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= start && saleDate <= end;
    });

    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalSales = filteredSales.length;
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

    return {
      totalRevenue,
      totalSales,
      averageSale,
      sales: filteredSales
    };
  },

  async getPurchaseReport(dateRange = 'this_month') {
    const { start, end } = getDateRange(dateRange);
    const purchases = await db.readTable('purchases');
    
    const filteredPurchases = purchases.filter(purchase => {
      const purchaseDate = new Date(purchase.createdAt);
      return purchaseDate >= start && purchaseDate <= end;
    });

    const totalPurchases = filteredPurchases.reduce((sum, purchase) => sum + purchase.total, 0);
    const purchaseCount = filteredPurchases.length;

    return {
      totalPurchases,
      purchaseCount,
      purchases: filteredPurchases
    };
  },

  async getExpenseReport(dateRange = 'this_month') {
    const { start, end } = getDateRange(dateRange);
    const expenses = await db.readTable('expenses');
    
    const filteredExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= start && expenseDate <= end;
    });

    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const expenseCount = filteredExpenses.length;

    // Group by category
    const byCategory = {};
    filteredExpenses.forEach(expense => {
      if (!byCategory[expense.category]) {
        byCategory[expense.category] = 0;
      }
      byCategory[expense.category] += expense.amount;
    });

    return {
      totalExpenses,
      expenseCount,
      byCategory,
      expenses: filteredExpenses
    };
  },

  async getInventoryReport() {
    const products = await db.readTable('products');
    const categories = await db.readTable('categories');
    
    const totalProducts = products.length;
    const totalStockValue = products.reduce((sum, product) => 
      sum + (product.quantity * product.costPrice), 0);
    const lowStockProducts = products.filter(p => 
      p.active && p.quantity <= p.reorderLevel && p.quantity > 0);
    const outOfStockProducts = products.filter(p => p.active && p.quantity <= 0);
    
    const categoryWise = categories.map(category => {
      const categoryProducts = products.filter(p => p.categoryId === category.id);
      return {
        category: category.name,
        productCount: categoryProducts.length,
        stockValue: categoryProducts.reduce((sum, p) => 
          sum + (p.quantity * p.costPrice), 0)
      };
    });

    return {
      totalProducts,
      totalStockValue,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      lowStockProducts,
      outOfStockProducts,
      categoryWise
    };
  },

  async getProfitLossReport(dateRange = 'this_month') {
    const salesReport = await this.getSalesReport(dateRange);
    const purchaseReport = await this.getPurchaseReport(dateRange);
    const expenseReport = await this.getExpenseReport(dateRange);

    const grossProfit = salesReport.totalRevenue - purchaseReport.totalPurchases;
    const netProfit = grossProfit - expenseReport.totalExpenses;

    return {
      revenue: salesReport.totalRevenue,
      purchases: purchaseReport.totalPurchases,
      expenses: expenseReport.totalExpenses,
      grossProfit,
      netProfit,
      profitMargin: salesReport.totalRevenue > 0 
        ? (netProfit / salesReport.totalRevenue) * 100 
        : 0
    };
  },

  async getTopSellingProducts(limit = 10, dateRange = 'this_month') {
    const { start, end } = getDateRange(dateRange);
    const sales = await db.readTable('sales');
    
    const productSales = {};
    
    sales.forEach(sale => {
      const saleDate = new Date(sale.createdAt);
      if (saleDate >= start && saleDate <= end) {
        sale.items.forEach(item => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = {
              productId: item.productId,
              productName: item.productName,
              quantity: 0,
              revenue: 0
            };
          }
          productSales[item.productId].quantity += item.quantity;
          productSales[item.productId].revenue += item.quantity * item.price;
        });
      }
    });
    
    return Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);
  }
};

module.exports = reportService;