const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Public routes (all authenticated users)
router.get('/', productController.getAllProducts);
router.get('/search', productController.searchProducts);
router.get('/low-stock', productController.getLowStockProducts);
router.get('/out-of-stock', productController.getOutOfStockProducts);
router.get('/:id', productController.getProduct);
router.get('/sku/:sku', productController.getProductBySku);
router.get('/barcode/:barcode', productController.getProductByBarcode);

// Manager and Admin routes
router.post('/', roleMiddleware('admin', 'manager'), productController.createProduct);
router.post('/bulk', roleMiddleware('admin', 'manager'), productController.bulkCreateProducts);
router.put('/:id', roleMiddleware('admin', 'manager'), productController.updateProduct);
router.patch('/:id/stock', roleMiddleware('admin', 'manager'), productController.updateStock);
router.patch('/:id/price', roleMiddleware('admin', 'manager'), productController.updatePrice);
router.patch('/:id/status', roleMiddleware('admin', 'manager'), productController.toggleProductStatus);

// Admin only routes
router.delete('/:id', roleMiddleware('admin'), productController.deleteProduct);
router.delete('/bulk', roleMiddleware('admin'), productController.bulkDeleteProducts);

module.exports = router;