const { db } = require('../services/jsonDatabase');
const { calculateTotal } = require('../utils/calculations');
const { generateOrderNumber } = require('../utils/idGenerator');
const stockService = require('../services/stockService');
const invoiceService = require('../services/invoiceService');

const saleController = {
  // Get all sales
  async getAllSales(req, res, next) {
    try {
      const { page = 1, limit = 50, status, paymentMethod } = req.query;
      
      let sales = await db.readTable('sales');
      
      if (status) {
        sales = sales.filter(s => s.status === status);
      }
      
      if (paymentMethod) {
        sales = sales.filter(s => s.paymentMethod === paymentMethod);
      }
      
      // Sort by date descending
      sales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedSales = sales.slice(startIndex, endIndex);
      
      // Add customer names
      const customers = await db.readTable('customers');
      const salesWithCustomer = paginatedSales.map(sale => ({
        ...sale,
        customerName: customers.find(c => c.id === sale.customerId)?.name || 'Walk-in Customer'
      }));
      
      res.json({
        success: true,
        data: salesWithCustomer,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: sales.length,
          pages: Math.ceil(sales.length / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get single sale
  async getSale(req, res, next) {
    try {
      const sale = await db.findById('sales', req.params.id);
      if (!sale) {
        return res.status(404).json({ message: 'Sale not found' });
      }
      
      const customer = sale.customerId ? await db.findById('customers', sale.customerId) : null;
      
      res.json({
        success: true,
        data: {
          ...sale,
          customerName: customer?.name || 'Walk-in Customer'
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get sale by order number
  async getSaleByOrderNumber(req, res, next) {
    try {
      const sale = await db.findOne('sales', { orderNumber: req.params.orderNumber });
      if (!sale) {
        return res.status(404).json({ message: 'Sale not found' });
      }
      res.json({ success: true, data: sale });
    } catch (error) {
      next(error);
    }
  },

  // Create sale
  async createSale(req, res, next) {
    try {
      const { customerId, items, discountPercent = 0, paymentMethod = 'cash', notes = '' } = req.body;
      
      if (!items || items.length === 0) {
        return res.status(400).json({ message: 'Sale must have at least one item' });
      }
      
      // Validate items and calculate totals
      let subtotal = 0;
      const validatedItems = [];
      
      for (const item of items) {
        const product = await db.findById('products', item.productId);
        if (!product) {
          return res.status(404).json({ message: `Product ${item.productId} not found` });
        }
        
        if (product.quantity < item.quantity) {
          return res.status(400).json({ 
            message: `Insufficient stock for ${product.name}. Available: ${product.quantity}` 
          });
        }
        
        const itemTotal = item.quantity * product.price;
        subtotal += itemTotal;
        
        validatedItems.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          price: product.price,
          costPrice: product.costPrice,
          total: itemTotal
        });
      }
      
      // Get settings for tax rate
      const settings = await db.findOne('settings', {});
      const taxRate = settings?.taxRate || 0;
      
      // Calculate totals
      const tax = subtotal * (taxRate / 100);
      const discount = subtotal * (discountPercent / 100);
      const total = subtotal + tax - discount;
      
      // Create sale
      const sale = await db.create('sales', {
        orderNumber: generateOrderNumber('SALE'),
        customerId,
        items: validatedItems,
        subtotal,
        tax,
        discount,
        total,
        paymentMethod,
        paymentStatus: 'paid',
        status: 'completed',
        notes,
        createdBy: req.userId
      });
      
      // Update stock
      for (const item of validatedItems) {
        await stockService.decreaseStock(item.productId, item.quantity, 'sale', sale.id);
      }
      
      // Create payment record
      await db.create('payments', {
        saleId: sale.id,
        amount: total,
        method: paymentMethod,
        status: 'completed',
        reference: sale.orderNumber
      });
      
      // Update customer stats
      if (customerId) {
        const customer = await db.findById('customers', customerId);
        if (customer) {
          await db.update('customers', customerId, {
            totalPurchases: (customer.totalPurchases || 0) + 1,
            totalSpent: (customer.totalSpent || 0) + total,
            loyaltyPoints: (customer.loyaltyPoints || 0) + Math.floor(total / 10)
          });
        }
      }
      
      // Create notification
      await db.create('notifications', {
        type: 'sale',
        title: 'New Sale Recorded',
        message: `Sale ${sale.orderNumber} completed for $${total.toFixed(2)}`,
        read: false,
        priority: 'info'
      });
      
      res.status(201).json({
        success: true,
        data: sale,
        message: 'Sale completed successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Create quick sale (no customer)
  async createQuickSale(req, res, next) {
    try {
      req.body.customerId = null;
      return this.createSale(req, res, next);
    } catch (error) {
      next(error);
    }
  },

  // Update sale
  async updateSale(req, res, next) {
    try {
      const sale = await db.update('sales', req.params.id, req.body);
      if (!sale) {
        return res.status(404).json({ message: 'Sale not found' });
      }
      res.json({
        success: true,
        data: sale,
        message: 'Sale updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Update sale status
  async updateSaleStatus(req, res, next) {
    try {
      const { status } = req.body;
      const validStatuses = ['completed', 'pending', 'cancelled', 'refunded'];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      const sale = await db.update('sales', req.params.id, { status });
      if (!sale) {
        return res.status(404).json({ message: 'Sale not found' });
      }
      
      res.json({
        success: true,
        data: sale,
        message: 'Sale status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Update payment status
  async updatePaymentStatus(req, res, next) {
    try {
      const { paymentStatus } = req.body;
      const sale = await db.update('sales', req.params.id, { paymentStatus });
      if (!sale) {
        return res.status(404).json({ message: 'Sale not found' });
      }
      res.json({
        success: true,
        data: sale,
        message: 'Payment status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Refund sale
  async refundSale(req, res, next) {
    try {
      const sale = await db.findById('sales', req.params.id);
      if (!sale) {
        return res.status(404).json({ message: 'Sale not found' });
      }
      
      if (sale.status === 'refunded') {
        return res.status(400).json({ message: 'Sale already refunded' });
      }
      
      // Return items to stock
      for (const item of sale.items) {
        await stockService.increaseStock(item.productId, item.quantity, 'refund', sale.id);
      }
      
      // Update sale status
      await db.update('sales', sale.id, { 
        status: 'refunded',
        paymentStatus: 'refunded'
      });
      
      // Create refund payment record
      await db.create('payments', {
        saleId: sale.id,
        amount: -sale.total,
        method: sale.paymentMethod,
        status: 'refunded',
        reference: `REFUND-${sale.orderNumber}`
      });
      
      res.json({ message: 'Sale refunded successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Generate invoice
  async generateInvoice(req, res, next) {
    try {
      const invoice = await invoiceService.generateInvoice(req.params.id);
      res.json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  },

  // Generate receipt
  async generateReceipt(req, res, next) {
    try {
      const receipt = await invoiceService.generateInvoice(req.params.id);
      res.json({ success: true, data: receipt });
    } catch (error) {
      next(error);
    }
  },

  // Get daily sales
  async getDailySales(req, res, next) {
    try {
      const sales = await db.readTable('sales');
      const today = new Date().toDateString();
      
      const dailySales = sales.filter(sale => 
        new Date(sale.createdAt).toDateString() === today
      );
      
      const total = dailySales.reduce((sum, sale) => sum + sale.total, 0);
      
      res.json({
        success: true,
        data: {
          date: today,
          count: dailySales.length,
          total
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get weekly sales
  async getWeeklySales(req, res, next) {
    try {
      const sales = await db.readTable('sales');
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      
      const weeklySales = sales.filter(sale => 
        new Date(sale.createdAt) >= weekStart
      );
      
      const total = weeklySales.reduce((sum, sale) => sum + sale.total, 0);
      
      res.json({
        success: true,
        data: {
          weekStart: weekStart.toISOString(),
          count: weeklySales.length,
          total
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get monthly sales
  async getMonthlySales(req, res, next) {
    try {
      const sales = await db.readTable('sales');
      const monthStart = new Date();
      monthStart.setDate(1);
      
      const monthlySales = sales.filter(sale => 
        new Date(sale.createdAt) >= monthStart
      );
      
      const total = monthlySales.reduce((sum, sale) => sum + sale.total, 0);
      
      res.json({
        success: true,
        data: {
          month: monthStart.toISOString(),
          count: monthlySales.length,
          total
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Search sales
  async searchSales(req, res, next) {
    try {
      const { q } = req.query;
      const sales = await db.readTable('sales');
      
      const results = sales.filter(sale =>
        sale.orderNumber.toLowerCase().includes(q.toLowerCase())
      );
      
      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  },

  // Get sales report
  async getSalesReport(req, res, next) {
    try {
      const { start, end } = req.query;
      const sales = await db.readTable('sales');
      
      const filteredSales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return (!start || saleDate >= new Date(start)) && 
               (!end || saleDate <= new Date(end));
      });
      
      const total = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
      
      res.json({
        success: true,
        data: {
          count: filteredSales.length,
          total,
          average: filteredSales.length > 0 ? total / filteredSales.length : 0
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete sale
  async deleteSale(req, res, next) {
    try {
      const sale = await db.findById('sales', req.params.id);
      if (!sale) {
        return res.status(404).json({ message: 'Sale not found' });
      }
      
      // Return items to stock
      for (const item of sale.items) {
        await stockService.increaseStock(item.productId, item.quantity, 'sale_delete', sale.id);
      }
      
      await db.delete('sales', req.params.id);
      res.json({ message: 'Sale deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = saleController;