const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Public routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/me', authMiddleware, authController.getMe);
router.put('/me', authMiddleware, authController.updateMe);
router.put('/change-password', authMiddleware, authController.changePassword);

// Admin routes
router.get('/users', authMiddleware, roleMiddleware('admin'), authController.getAllUsers);
router.put('/users/:id', authMiddleware, roleMiddleware('admin'), authController.updateUser);
router.delete('/users/:id', authMiddleware, roleMiddleware('admin'), authController.deleteUser);
router.put('/users/:id/activate', authMiddleware, roleMiddleware('admin'), authController.activateUser);
router.put('/users/:id/deactivate', authMiddleware, roleMiddleware('admin'), authController.deactivateUser);

module.exports = router;