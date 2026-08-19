const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./authRoutes');
const productRoutes = require('./productRoutes');
const categoryRoutes = require('./categoryRoutes');
const supplierRoutes = require('./supplierRoutes');
const customerRoutes = require('./customerRoutes');
const saleRoutes = require('./saleRoutes');
const purchaseRoutes = require('./purchaseRoutes');
const expenseRoutes = require('./expenseRoutes');
const paymentRoutes = require('./paymentRoutes');
const returnRoutes = require('./returnRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const reportRoutes = require('./reportRoutes');
const notificationRoutes = require('./notificationRoutes');

// Mount all routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/customers', customerRoutes);
router.use('/sales', saleRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/expenses', expenseRoutes);
router.use('/payments', paymentRoutes);
router.use('/returns', returnRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);

// API documentation route
router.get('/docs', (req, res) => {
    res.json({
        name: 'SmartStore API',
        version: '1.0.0',
        description: 'Inventory Management System API',
        endpoints: {
            auth: '/api/auth',
            products: '/api/products',
            categories: '/api/categories',
            suppliers: '/api/suppliers',
            customers: '/api/customers',
            sales: '/api/sales',
            purchases: '/api/purchases',
            expenses: '/api/expenses',
            payments: '/api/payments',
            returns: '/api/returns',
            inventory: '/api/inventory',
            reports: '/api/reports',
            notifications: '/api/notifications'
        }
    });
});

module.exports = router;