const { db } = require('../services/jsonDatabase');
const stockService = require('../services/stockService');
const { generateId } = require('../utils/idGenerator');

const returnController = {
  // Get all returns
  async getAllReturns(req, res, next) {
    try {
      const returns = await db.readTable('returns');
      returns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.json({ success: true, data: returns });
    } catch (error) {
      next(error);
    }
  },

  // Get single return
  async getReturn(req, res, next) {
    try {
      const returnRecord = await db.findById('returns', req.params.id);
      if (!returnRecord) {
        return res.status(404).json({ message: 'Return not found' });
      }
      res.json({ success: true, data: returnRecord });
    } catch (error) {
      next(error);
    }
  },

  // Get returns by sale
  async getReturnsBySale(req, res, next) {
    try {
      const returns = await db.find('returns', { saleId: req.params.saleId });
      res.json({ success: true, data: returns });
    } catch (error) {
      next(error);
    }
  },

  // Get returns by product
  async getReturnsByProduct(req, res, next) {
    try {
      const returns = await db.readTable('returns');
      const productReturns = returns.filter(r => 
        r.items.some(item => item.productId === req.params.productId)
      );
      res.json({ success: true, data: productReturns });
    } catch (error) {
      next(error);
    }
  },

  // Create return
  async createReturn(req, res, next) {
    try {
      const { saleId, items, reason } = req.body;
      
      if (!saleId) {
        return res.status(400).json({ message: 'Sale ID is required' });
      }
      
      if (!items || items.length === 0) {
        return res.status(400).json({ message: 'Return must have at least one item' });
      }
      
      // Validate sale exists
      const sale = await db.findById('sales', saleId);
      if (!sale) {
        return res.status(404).json({ message: 'Sale not found' });
      }
      
      // Calculate refund amount
      let refundAmount = 0;
      const validatedItems = [];
      
      for (const item of items) {
        const saleItem = sale.items.find(si => si.productId === item.productId);
        if (!saleItem) {
          return res.status(400).json({ 
            message: `Product ${item.productId} not found in sale` 
          });
        }
        
        if (item.quantity > saleItem.quantity) {
          return res.status(400).json({ 
            message: `Return quantity exceeds purchased quantity for product ${saleItem.productName}` 
          });
        }
        
        const itemRefund = item.quantity * saleItem.price;
        refundAmount += itemRefund;
        
        validatedItems.push({
          ...item,
          productName: saleItem.productName,
          price: saleItem.price
        });
      }
      
      const returnRecord = await db.create('returns', {
        returnNumber: generateId('RET'),
        saleId,
        items: validatedItems,
        reason: reason || '',
        refundAmount,
        status: 'pending',
        createdBy: req.userId
      });
      
      res.status(201).json({
        success: true,
        data: returnRecord,
        message: 'Return created successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Process return
  async processReturn(req, res, next) {
    try {
      const returnRecord = await db.findById('returns', req.params.id);
      if (!returnRecord) {
        return res.status(404).json({ message: 'Return not found' });
      }
      
      if (returnRecord.status === 'processed') {
        return res.status(400).json({ message: 'Return already processed' });
      }
      
      // Return items to stock
      for (const item of returnRecord.items) {
        await stockService.increaseStock(
          item.productId, 
          item.quantity, 
          'return', 
          returnRecord.id
        );
      }
      
      const updatedReturn = await db.update('returns', returnRecord.id, {
        status: 'processed',
        processedAt: new Date().toISOString()
      });
      
      res.json({
        success: true,
        data: updatedReturn,
        message: 'Return processed successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Refund return
  async refundReturn(req, res, next) {
    try {
      const returnRecord = await db.findById('returns', req.params.id);
      if (!returnRecord) {
        return res.status(404).json({ message: 'Return not found' });
      }
      
      if (returnRecord.status === 'refunded') {
        return res.status(400).json({ message: 'Return already refunded' });
      }
      
      // Create refund payment
      await db.create('payments', {
        saleId: returnRecord.saleId,
        amount: -returnRecord.refundAmount,
        method: 'refund',
        status: 'refunded',
        reference: `REFUND-${returnRecord.returnNumber}`
      });
      
      const updatedReturn = await db.update('returns', returnRecord.id, {
        status: 'refunded',
        refundedAt: new Date().toISOString()
      });
      
      res.json({
        success: true,
        data: updatedReturn,
        message: 'Return refunded successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Update return
  async updateReturn(req, res, next) {
    try {
      const returnRecord = await db.update('returns', req.params.id, req.body);
      if (!returnRecord) {
        return res.status(404).json({ message: 'Return not found' });
      }
      res.json({
        success: true,
        data: returnRecord,
        message: 'Return updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Update return status
  async updateReturnStatus(req, res, next) {
    try {
      const { status } = req.body;
      const returnRecord = await db.update('returns', req.params.id, { status });
      if (!returnRecord) {
        return res.status(404).json({ message: 'Return not found' });
      }
      res.json({
        success: true,
        data: returnRecord,
        message: 'Return status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Search returns
  async searchReturns(req, res, next) {
    try {
      const { q } = req.query;
      const returns = await db.readTable('returns');
      
      const results = returns.filter(r =>
        r.returnNumber?.toLowerCase().includes(q.toLowerCase()) ||
        r.reason?.toLowerCase().includes(q.toLowerCase())
      );
      
      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  },

  // Get return report
  async getReturnReport(req, res, next) {
    try {
      const { start, end } = req.query;
      const returns = await db.readTable('returns');
      
      const filteredReturns = returns.filter(r => {
        const returnDate = new Date(r.createdAt);
        return (!start || returnDate >= new Date(start)) && 
               (!end || returnDate <= new Date(end));
      });
      
      const totalRefund = filteredReturns.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
      
      res.json({
        success: true,
        data: {
          count: filteredReturns.length,
          totalRefund
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get returns by date range
  async getReturnsByDateRange(req, res, next) {
    try {
      const { start, end } = req.query;
      const returns = await db.readTable('returns');
      
      const filteredReturns = returns.filter(r => {
        const returnDate = new Date(r.createdAt);
        return (!start || returnDate >= new Date(start)) && 
               (!end || returnDate <= new Date(end));
      });
      
      res.json({ success: true, data: filteredReturns });
    } catch (error) {
      next(error);
    }
  },

  // Delete return
  async deleteReturn(req, res, next) {
    try {
      const returnRecord = await db.findById('returns', req.params.id);
      if (!returnRecord) {
        return res.status(404).json({ message: 'Return not found' });
      }
      
      if (returnRecord.status === 'processed') {
        return res.status(400).json({ message: 'Cannot delete processed return' });
      }
      
      await db.delete('returns', req.params.id);
      res.json({ message: 'Return deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = returnController;