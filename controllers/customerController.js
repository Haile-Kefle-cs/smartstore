const { db } = require('../services/jsonDatabase');
const { validateRequired, validateEmail, validatePhone } = require('../utils/validators');

const customerController = {
  // Get all customers
  async getAllCustomers(req, res, next) {
    try {
      const customers = await db.readTable('customers');
      res.json({ success: true, data: customers });
    } catch (error) {
      next(error);
    }
  },

  // Search customers
  async searchCustomers(req, res, next) {
    try {
      const { q } = req.query;
      const customers = await db.readTable('customers');
      
      const results = customers.filter(customer =>
        customer.name.toLowerCase().includes(q.toLowerCase()) ||
        customer.email.toLowerCase().includes(q.toLowerCase()) ||
        customer.phone.includes(q)
      );
      
      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  },

  // Get top customers
  async getTopCustomers(req, res, next) {
    try {
      const customers = await db.readTable('customers');
      const sorted = customers.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
      res.json({ success: true, data: sorted.slice(0, 10) });
    } catch (error) {
      next(error);
    }
  },

  // Get single customer
  async getCustomer(req, res, next) {
    try {
      const customer = await db.findById('customers', req.params.id);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      res.json({ success: true, data: customer });
    } catch (error) {
      next(error);
    }
  },

  // Get customer sales
  async getCustomerSales(req, res, next) {
    try {
      const sales = await db.find('sales', { customerId: req.params.id });
      res.json({ success: true, data: sales });
    } catch (error) {
      next(error);
    }
  },

  // Get customer purchase history
  async getCustomerPurchaseHistory(req, res, next) {
    try {
      const sales = await db.find('sales', { customerId: req.params.id });
      const sortedSales = sales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.json({ success: true, data: sortedSales });
    } catch (error) {
      next(error);
    }
  },

  // Get customer loyalty points
  async getCustomerLoyaltyPoints(req, res, next) {
    try {
      const customer = await db.findById('customers', req.params.id);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      res.json({ success: true, points: customer.loyaltyPoints || 0 });
    } catch (error) {
      next(error);
    }
  },

  // Create customer
  async createCustomer(req, res, next) {
    try {
      const { name, email, phone, address } = req.body;
      
      validateRequired(name, 'Customer name');
      
      if (email && !validateEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      
      if (phone && !validatePhone(phone)) {
        return res.status(400).json({ message: 'Invalid phone number' });
      }
      
      const customer = await db.create('customers', {
        name,
        email: email || '',
        phone: phone || '',
        address: address || '',
        totalPurchases: 0,
        totalSpent: 0,
        loyaltyPoints: 0,
        active: true
      });
      
      res.status(201).json({
        success: true,
        data: customer,
        message: 'Customer created successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Update customer
  async updateCustomer(req, res, next) {
    try {
      const customer = await db.update('customers', req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      res.json({
        success: true,
        data: customer,
        message: 'Customer updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Toggle customer status
  async toggleCustomerStatus(req, res, next) {
    try {
      const customer = await db.findById('customers', req.params.id);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      
      const updatedCustomer = await db.update('customers', req.params.id, {
        active: !customer.active
      });
      
      res.json({
        success: true,
        data: updatedCustomer,
        message: `Customer ${updatedCustomer.active ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      next(error);
    }
  },

  // Update loyalty points
  async updateLoyaltyPoints(req, res, next) {
    try {
      const { points, operation = 'add' } = req.body;
      const customer = await db.findById('customers', req.params.id);
      
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      
      let newPoints = customer.loyaltyPoints || 0;
      if (operation === 'add') {
        newPoints += points;
      } else if (operation === 'subtract') {
        newPoints = Math.max(0, newPoints - points);
      } else if (operation === 'set') {
        newPoints = points;
      }
      
      const updatedCustomer = await db.update('customers', req.params.id, {
        loyaltyPoints: newPoints
      });
      
      res.json({
        success: true,
        data: updatedCustomer,
        message: 'Loyalty points updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete customer
  async deleteCustomer(req, res, next) {
    try {
      const sales = await db.find('sales', { customerId: req.params.id });
      if (sales.length > 0) {
        return res.status(400).json({ message: 'Cannot delete customer with purchase history' });
      }
      
      await db.delete('customers', req.params.id);
      res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Bulk delete customers
  async bulkDeleteCustomers(req, res, next) {
    try {
      const { ids } = req.body;
      let deletedCount = 0;
      
      for (const id of ids) {
        const sales = await db.find('sales', { customerId: id });
        if (sales.length === 0) {
          await db.delete('customers', id);
          deletedCount++;
        }
      }
      
      res.json({ success: true, deleted: deletedCount });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = customerController;