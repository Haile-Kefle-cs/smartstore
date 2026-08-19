const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../services/jsonDatabase');
const { validateEmail, validatePassword, validatePhone } = require('../utils/validators');
const { generateId } = require('../utils/idGenerator');

const authController = {
  // Login user
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const user = await db.findOne('users', { email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (!user.active) {
        return res.status(401).json({ message: 'Account is deactivated. Contact administrator.' });
      }

      // Update last login
      await db.update('users', user.id, { lastLogin: new Date().toISOString() });

      const token = jwt.sign(
        { id: user.id, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      const { password: _, ...userWithoutPassword } = user;
      res.json({
        success: true,
        token,
        user: userWithoutPassword
      });
    } catch (error) {
      next(error);
    }
  },

  // Register new user
  async register(req, res, next) {
    try {
      const { name, email, password, phone, role = 'cashier' } = req.body;

      // Validation
      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email and password are required' });
      }

      if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      if (!validatePassword(password)) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }

      const existingUser = await db.findOne('users', { email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Validate role
      const validRoles = ['admin', 'manager', 'cashier'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await db.create('users', {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone: phone || '',
        role,
        active: true
      });

      const token = jwt.sign(
        { id: user.id, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({
        success: true,
        token,
        user: userWithoutPassword
      });
    } catch (error) {
      next(error);
    }
  },

  // Get current user
  async getMe(req, res, next) {
    try {
      const user = await db.findById('users', req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({
        success: true,
        user: userWithoutPassword
      });
    } catch (error) {
      next(error);
    }
  },

  // Update current user
  async updateMe(req, res, next) {
    try {
      const { name, phone } = req.body;
      const updates = {};

      if (name) updates.name = name;
      if (phone) {
        if (!validatePhone(phone)) {
          return res.status(400).json({ message: 'Invalid phone number' });
        }
        updates.phone = phone;
      }

      const user = await db.update('users', req.userId, updates);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({
        success: true,
        user: userWithoutPassword
      });
    } catch (error) {
      next(error);
    }
  },

  // Change password
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new password are required' });
      }

      const user = await db.findById('users', req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      if (!validatePassword(newPassword)) {
        return res.status(400).json({ message: 'New password must be at least 6 characters' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update('users', req.userId, { password: hashedPassword });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Get all users (admin only)
  async getAllUsers(req, res, next) {
    try {
      const users = await db.readTable('users');
      const usersWithoutPassword = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPassword);
    } catch (error) {
      next(error);
    }
  },

  // Update user (admin only)
  async updateUser(req, res, next) {
    try {
      const { name, email, phone, role, active } = req.body;
      const updates = {};

      if (name) updates.name = name;
      if (phone) updates.phone = phone;
      if (role) {
        const validRoles = ['admin', 'manager', 'cashier'];
        if (!validRoles.includes(role)) {
          return res.status(400).json({ message: 'Invalid role' });
        }
        updates.role = role;
      }
      if (typeof active === 'boolean') updates.active = active;

      const user = await db.update('users', req.params.id, updates);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  },

  // Delete user (admin only)
  async deleteUser(req, res, next) {
    try {
      const user = await db.findById('users', req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.role === 'admin') {
        const adminCount = (await db.find('users', { role: 'admin' })).length;
        if (adminCount <= 1) {
          return res.status(400).json({ message: 'Cannot delete the last admin user' });
        }
      }

      await db.delete('users', req.params.id);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Activate user
  async activateUser(req, res, next) {
    try {
      const user = await db.update('users', req.params.id, { active: true });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ message: 'User activated successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Deactivate user
  async deactivateUser(req, res, next) {
    try {
      const user = await db.findById('users', req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.role === 'admin') {
        const adminCount = (await db.find('users', { role: 'admin', active: true })).length;
        if (adminCount <= 1) {
          return res.status(400).json({ message: 'Cannot deactivate the last active admin user' });
        }
      }

      await db.update('users', req.params.id, { active: false });
      res.json({ message: 'User deactivated successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Forgot password
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const user = await db.findOne('users', { email: email.toLowerCase() });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // In a real application, send password reset email here
      // For demo, just return success message
      res.json({ message: 'Password reset instructions sent to your email' });
    } catch (error) {
      next(error);
    }
  },

  // Reset password
  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }

      if (!validatePassword(newPassword)) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }

      // In a real application, verify reset token here
      // For demo, just return success message
      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;