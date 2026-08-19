const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Public routes (all authenticated users)
router.get('/', saleController.getAllSales);
router.get('/search', saleController.searchSales);
router.get('/report', saleController.getSalesReport);
router.get('/daily', saleController.getDailySales);
router.get('/weekly', saleController.getWeeklySales);
router.get('/monthly', saleController.getMonthlySales);
router.get('/:id', saleController.getSale);
router.get('/order/:orderNumber', saleController.getSaleByOrderNumber);
router.get('/:id/invoice', saleController.generateInvoice);
router.get('/:id/receipt', saleController.generateReceipt);

// Cashier, Manager, and Admin routes
router.post('/', roleMiddleware('admin', 'manager', 'cashier'), saleController.createSale);
router.post('/quick-sale', roleMiddleware('admin', 'manager', 'cashier'), saleController.createQuickSale);
router.post('/:id/refund', roleMiddleware('admin', 'manager'), saleController.refundSale);

// Manager and Admin routes
router.put('/:id', roleMiddleware('admin', 'manager'), saleController.updateSale);
router.patch('/:id/status', roleMiddleware('admin', 'manager'), saleController.updateSaleStatus);
router.patch('/:id/payment', roleMiddleware('admin', 'manager'), saleController.updatePaymentStatus);

// Admin only routes
router.delete('/:id', roleMiddleware('admin'), saleController.deleteSale);

module.exports = router;