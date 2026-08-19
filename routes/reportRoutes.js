const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All report routes require authentication and manager/admin role
router.use(authMiddleware);
router.use(roleMiddleware('admin', 'manager'));

// Sales Reports
router.get('/sales', reportController.getSalesReport);
router.get('/sales/daily', reportController.getDailySalesReport);
router.get('/sales/weekly', reportController.getWeeklySalesReport);
router.get('/sales/monthly', reportController.getMonthlySalesReport);
router.get('/sales/by-product', reportController.getSalesByProduct);
router.get('/sales/by-category', reportController.getSalesByCategory);
router.get('/sales/by-customer', reportController.getSalesByCustomer);
router.get('/sales/by-payment-method', reportController.getSalesByPaymentMethod);

// Purchase Reports
router.get('/purchases', reportController.getPurchaseReport);
router.get('/purchases/by-supplier', reportController.getPurchasesBySupplier);
router.get('/purchases/by-product', reportController.getPurchasesByProduct);

// Expense Reports
router.get('/expenses', reportController.getExpenseReport);
router.get('/expenses/by-category', reportController.getExpensesByCategory);
router.get('/expenses/monthly', reportController.getMonthlyExpenseReport);

// Inventory Reports
router.get('/inventory', reportController.getInventoryReport);
router.get('/inventory/value', reportController.getInventoryValueReport);
router.get('/inventory/turnover', reportController.getInventoryTurnoverReport);
router.get('/inventory/aging', reportController.getInventoryAgingReport);

// Financial Reports
router.get('/profit-loss', reportController.getProfitLossReport);
router.get('/cash-flow', reportController.getCashFlowReport);
router.get('/tax', reportController.getTaxReport);

// Customer Reports
router.get('/customers', reportController.getCustomerReport);
router.get('/customers/loyalty', reportController.getLoyaltyReport);
router.get('/customers/retention', reportController.getCustomerRetentionReport);

// Performance Reports
router.get('/performance/sales', reportController.getSalesPerformanceReport);
router.get('/performance/products', reportController.getProductPerformanceReport);
router.get('/performance/employees', reportController.getEmployeePerformanceReport);

// Export Reports
router.get('/export/sales', reportController.exportSalesReport);
router.get('/export/purchases', reportController.exportPurchaseReport);
router.get('/export/expenses', reportController.exportExpenseReport);
router.get('/export/inventory', reportController.exportInventoryReport);
router.get('/export/profit-loss', reportController.exportProfitLossReport);

module.exports = router;