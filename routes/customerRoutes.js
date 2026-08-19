const express = require('express');
const router = express.Router();
const { db } = require('../services/jsonDatabase');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const customers = await db.readTable('customers');
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', roleMiddleware('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const customer = await db.create('customers', req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', roleMiddleware('admin', 'manager'), async (req, res) => {
  try {
    const customer = await db.update('customers', req.params.id, req.body);
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', roleMiddleware('admin'), async (req, res) => {
  try {
    await db.delete('customers', req.params.id);
    res.json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;