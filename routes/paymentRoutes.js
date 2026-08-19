const express = require('express');
const router = express.Router();
const { db } = require('../services/jsonDatabase');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const payments = await db.readTable('payments');
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', roleMiddleware('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const payment = await db.create('payments', req.body);
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;