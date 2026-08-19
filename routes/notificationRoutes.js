const express = require('express');
const router = express.Router();
const { db } = require('../services/jsonDatabase');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Get all notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await db.readTable('notifications');
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get unread notifications
router.get('/unread', async (req, res) => {
  try {
    const notifications = await db.find('notifications', { read: false });
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const notifications = await db.find('notifications', { read: false });
    res.json({ success: true, count: notifications.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single notification
router.get('/:id', async (req, res) => {
  try {
    const notification = await db.findById('notifications', req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await db.update('notifications', req.params.id, { read: true });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark notification as unread
router.patch('/:id/unread', async (req, res) => {
  try {
    const notification = await db.update('notifications', req.params.id, { read: false });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark all as read
router.patch('/read-all', async (req, res) => {
  try {
    const notifications = await db.readTable('notifications');
    for (const notification of notifications) {
      if (!notification.read) {
        await db.update('notifications', notification.id, { read: true });
      }
    }
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create notification (admin/manager only)
router.post('/', roleMiddleware('admin', 'manager'), async (req, res) => {
  try {
    const { type, title, message, priority = 'info' } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }
    
    const notification = await db.create('notifications', {
      type: type || 'system',
      title,
      message,
      priority,
      read: false
    });
    
    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete notification (admin only)
router.delete('/:id', roleMiddleware('admin'), async (req, res) => {
  try {
    await db.delete('notifications', req.params.id);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete all notifications (admin only)
router.delete('/', roleMiddleware('admin'), async (req, res) => {
  try {
    await db.writeTable('notifications', []);
    res.json({ success: true, message: 'All notifications deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;