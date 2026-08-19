const express = require('express');
const router = express.Router();
const { db } = require('../services/jsonDatabase');
const stockService = require('../services/stockService');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const returns = await db.readTable('returns');
    res.json({ success: true, data: returns });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', roleMiddleware('admin', 'manager'), async (req, res) => {
  try {
    const { saleId, items, reason } = req.body;
    
    const returnRecord = await db.create('returns', {
      saleId,
      items,
      reason,
      status: 'pending',
      createdBy: req.userId
    });

    res.status(201).json({ success: true, data: returnRecord });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;