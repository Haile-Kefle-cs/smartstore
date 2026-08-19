const express = require('express');
const router = express.Router();
const { db } = require('../services/jsonDatabase');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const suppliers = await db.readTable('suppliers');
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', roleMiddleware('admin', 'manager'), async (req, res) => {
  try {
    const supplier = await db.create('suppliers', req.body);
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', roleMiddleware('admin', 'manager'), async (req, res) => {
  try {
    const supplier = await db.update('suppliers', req.params.id, req.body);
    res.json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', roleMiddleware('admin'), async (req, res) => {
  try {
    await db.delete('suppliers', req.params.id);
    res.json({ success: true, message: 'Supplier deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;