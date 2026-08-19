const express = require('express');
const router = express.Router();
const { db } = require('../services/jsonDatabase');
const { generateOrderNumber } = require('../utils/idGenerator');
const stockService = require('../services/stockService');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const purchases = await db.readTable('purchases');
    res.json({ success: true, data: purchases });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', roleMiddleware('admin', 'manager'), async (req, res) => {
  try {
    const { supplierId, items, notes = '' } = req.body;
    
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
    
    const purchase = await db.create('purchases', {
      orderNumber: generateOrderNumber('PO'),
      supplierId,
      items,
      subtotal,
      total: subtotal,
      status: 'received',
      notes,
      createdBy: req.userId
    });

    for (const item of items) {
      await stockService.increaseStock(item.productId, item.quantity, 'purchase', purchase.id);
    }

    res.status(201).json({ success: true, data: purchase });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;