const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Public routes (all authenticated users)
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategory);
router.get('/:id/products', categoryController.getCategoryProducts);
router.get('/:id/product-count', categoryController.getCategoryProductCount);

// Manager and Admin routes
router.post('/', roleMiddleware('admin', 'manager'), categoryController.createCategory);
router.put('/:id', roleMiddleware('admin', 'manager'), categoryController.updateCategory);
router.patch('/:id/status', roleMiddleware('admin', 'manager'), categoryController.toggleCategoryStatus);

// Admin only routes
router.delete('/:id', roleMiddleware('admin'), categoryController.deleteCategory);
router.delete('/bulk', roleMiddleware('admin'), categoryController.bulkDeleteCategories);

module.exports = router;