const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Public routes (all authenticated users)
router.get('/', inventoryController.getInventorySummary);
router.get('/movements', inventoryController.getStockMovements);
router.get('/movements/recent', inventoryController.getRecentMovements);
router.get('/low-stock', inventoryController.getLowStockProducts);
router.get('/out-of-stock', inventoryController.getOutOfStockProducts);
router.get('/value', inventoryController.getInventoryValue);
router.get('/product/:productId', inventoryController.getProductInventory);
router.get('/product/:productId/movements', inventoryController.getProductMovements);

// Manager and Admin routes
router.post('/adjust', roleMiddleware('admin', 'manager'), inventoryController.adjustStock);
router.post('/transfer', roleMiddleware('admin', 'manager'), inventoryController.transferStock);
router.post('/count', roleMiddleware('admin', 'manager'), inventoryController.stockCount);
router.post('/reorder', roleMiddleware('admin', 'manager'), inventoryController.createReorderRequest);

// Admin only routes
router.post('/clear', roleMiddleware('admin'), inventoryController.clearInventory);
router.delete('/movements/:id', roleMiddleware('admin'), inventoryController.deleteMovement);

module.exports = router;