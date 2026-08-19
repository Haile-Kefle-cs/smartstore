const express = require('express');
const router = express.Router();
const { db } = require('../services/jsonDatabase');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const expenses = await db.readTable('expenses');
    res.json({ success: true, data: expenses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', roleMiddleware('admin', 'manager'), async (req, res) => {
  try {
    const expense = await db.create('expenses', {
      ...req.body,
      createdBy: req.userId
    });
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;