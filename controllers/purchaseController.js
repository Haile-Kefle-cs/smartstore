const { db } = require('../services/jsonDatabase');
const { generateOrderNumber } = require('../utils/idGenerator');
const stockService = require('../services/stockService');
const invoiceService = require('../services/invoiceService');

const purchaseController = {
  // Get all purchases
  async getAllPurchases(req, res, next) {
    try {
      const purchases = await db.readTable('purchases');
      const suppliers = await db.readTable('suppliers');
      
      const purchasesWithSupplier = purchases.map(purchase => ({
        ...purchase,
        supplierName: suppliers.find(s => s.id === purchase.supplierId)?.companyName || 'Unknown Supplier'
      }));
      
      res.json({ success: true, data: purchasesWithSupplier });
    } catch (error) {
      next(error);
    }
  },

  // Get single purchase
  async getPurchase(req, res, next) {
    try {
      const purchase = await db.findById('purchases', req.params.id);
      if (!purchase) {
        return res.status(404).json({ message: 'Purchase not found' });
      }
      res.json({ success: true, data: purchase });
    } catch (error) {
      next(error);
    }
  },

  // Get purchase by order number
  async getPurchaseByOrderNumber(req, res, next) {
    try {
      const purchase = await db.findOne('purchases', { orderNumber: req.params.orderNumber });
      if (!purchase) {
        return res.status(404).json({ message: 'Purchase not found' });
      }
      res.json({ success: true, data: purchase });
    } catch (error) {
      next(error);
    }
  },

  // Create purchase
  async createPurchase(req, res, next) {
    try {
      const { supplierId, items, notes = '' } = req.body;
      
      if (!supplierId) {
        return res.status(400).json({ message: 'Supplier is required' });
      }
      
      if (!items || items.length === 0) {
        return res.status(400).json({ message: 'Purchase must have at least one item' });
      }
      
      let subtotal = 0;
      const validatedItems = [];
      
      for (const item of items) {
        const product = await db.findById('products', item.productId);
        if (!product) {
          return res.status(404).json({ message: `Product ${item.productId} not found` });
        }
        
        const itemTotal = item.quantity * item.costPrice;
        subtotal += itemTotal;
        
        validatedItems.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          costPrice: item.costPrice,
          total: itemTotal
        });
      }
      
      const purchase = await db.create('purchases', {
        orderNumber: generateOrderNumber('PO'),
        supplierId,
        items: validatedItems,
        subtotal,
        tax: 0,
        total: subtotal,
        status: 'pending',
        notes,
        createdBy: req.userId
      });
      
      res.status(201).json({
        success: true,
        data: purchase,
        message: 'Purchase order created successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Receive purchase
  async receivePurchase(req, res, next) {
    try {
      const purchase = await db.findById('purchases', req.params.id);
      if (!purchase) {
        return res.status(404).json({ message: 'Purchase not found' });
      }
      
      if (purchase.status === 'received') {
        return res.status(400).json({ message: 'Purchase already received' });
      }
      
      // Update stock for each item
      for (const item of purchase.items) {
        await stockService.increaseStock(item.productId, item.quantity, 'purchase', purchase.id);
      }
      
      const updatedPurchase = await db.update('purchases', purchase.id, {
        status: 'received'
      });
      
      res.json({
        success: true,
        data: updatedPurchase,
        message: 'Purchase received successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Update purchase
  async updatePurchase(req, res, next) {
    try {
      const purchase = await db.update('purchases', req.params.id, req.body);
      if (!purchase) {
        return res.status(404).json({ message: 'Purchase not found' });
      }
      res.json({
        success: true,
        data: purchase,
        message: 'Purchase updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Update purchase status
  async updatePurchaseStatus(req, res, next) {
    try {
      const { status } = req.body;
      const purchase = await db.update('purchases', req.params.id, { status });
      if (!purchase) {
        return res.status(404).json({ message: 'Purchase not found' });
      }
      res.json({
        success: true,
        data: purchase,
        message: 'Purchase status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Generate purchase order
  async generatePurchaseOrder(req, res, next) {
    try {
      const po = await invoiceService.generatePurchaseOrder(req.params.id);
      res.json({ success: true, data: po });
    } catch (error) {
      next(error);
    }
  },

  // Search purchases
  async searchPurchases(req, res, next) {
    try {
      const { q } = req.query;
      const purchases = await db.readTable('purchases');
      
      const results = purchases.filter(purchase =>
        purchase.orderNumber.toLowerCase().includes(q.toLowerCase())
      );
      
      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  },

  // Get purchase report
  async getPurchaseReport(req, res, next) {
    try {
      const { start, end } = req.query;
      const purchases = await db.readTable('purchases');
      
      const filteredPurchases = purchases.filter(purchase => {
        const purchaseDate = new Date(purchase.createdAt);
        return (!start || purchaseDate >= new Date(start)) && 
               (!end || purchaseDate <= new Date(end));
      });
      
      const total = filteredPurchases.reduce((sum, purchase) => sum + purchase.total, 0);
      
      res.json({
        success: true,
        data: {
          count: filteredPurchases.length,
          total
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete purchase
  async deletePurchase(req, res, next) {
    try {
      const purchase = await db.findById('purchases', req.params.id);
      if (!purchase) {
        return res.status(404).json({ message: 'Purchase not found' });
      }
      
      if (purchase.status === 'received') {
        return res.status(400).json({ message: 'Cannot delete received purchase' });
      }
      
      await db.delete('purchases', req.params.id);
      res.json({ message: 'Purchase deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = purchaseController;