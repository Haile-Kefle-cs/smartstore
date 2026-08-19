const { db } = require('../services/jsonDatabase');
const { validateRequired, validateNumber } = require('../utils/validators');

const paymentController = {
  // Get all payments
  async getAllPayments(req, res, next) {
    try {
      const payments = await db.readTable('payments');
      payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.json({ success: true, data: payments });
    } catch (error) {
      next(error);
    }
  },

  // Get single payment
  async getPayment(req, res, next) {
    try {
      const payment = await db.findById('payments', req.params.id);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }
      res.json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  },

  // Get payments by sale
  async getPaymentsBySale(req, res, next) {
    try {
      const payments = await db.find('payments', { saleId: req.params.saleId });
      res.json({ success: true, data: payments });
    } catch (error) {
      next(error);
    }
  },

  // Get payments by method
  async getPaymentsByMethod(req, res, next) {
    try {
      const payments = await db.find('payments', { method: req.params.method });
      res.json({ success: true, data: payments });
    } catch (error) {
      next(error);
    }
  },

  // Get payments by date range
  async getPaymentsByDateRange(req, res, next) {
    try {
      const { start, end } = req.query;
      const payments = await db.readTable('payments');
      
      const filteredPayments = payments.filter(payment => {
        const paymentDate = new Date(payment.createdAt);
        return (!start || paymentDate >= new Date(start)) && 
               (!end || paymentDate <= new Date(end));
      });
      
      res.json({ success: true, data: filteredPayments });
    } catch (error) {
      next(error);
    }
  },

  // Create payment
  async createPayment(req, res, next) {
    try {
      const { saleId, amount, method, reference } = req.body;
      
      validateRequired(saleId, 'Sale ID');
      validateNumber(amount, 'Amount');
      validateRequired(method, 'Payment method');
      
      const payment = await db.create('payments', {
        saleId,
        amount: parseFloat(amount),
        method,
        status: 'completed',
        reference: reference || '',
        createdBy: req.userId
      });
      
      res.status(201).json({
        success: true,
        data: payment,
        message: 'Payment recorded successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Create refund
  async createRefund(req, res, next) {
    try {
      const { saleId, amount, reason } = req.body;
      
      const payment = await db.create('payments', {
        saleId,
        amount: -Math.abs(parseFloat(amount)),
        method: 'refund',
        status: 'refunded',
        reference: `REFUND-${Date.now()}`,
        reason: reason || '',
        createdBy: req.userId
      });
      
      res.status(201).json({
        success: true,
        data: payment,
        message: 'Refund processed successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Update payment
  async updatePayment(req, res, next) {
    try {
      const payment = await db.update('payments', req.params.id, req.body);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }
      res.json({
        success: true,
        data: payment,
        message: 'Payment updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Update payment status
  async updatePaymentStatus(req, res, next) {
    try {
      const { status } = req.body;
      const payment = await db.update('payments', req.params.id, { status });
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }
      res.json({
        success: true,
        data: payment,
        message: 'Payment status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Search payments
  async searchPayments(req, res, next) {
    try {
      const { q } = req.query;
      const payments = await db.readTable('payments');
      
      const results = payments.filter(payment =>
        payment.reference?.toLowerCase().includes(q.toLowerCase()) ||
        payment.method?.toLowerCase().includes(q.toLowerCase())
      );
      
      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  },

  // Get payment report
  async getPaymentReport(req, res, next) {
    try {
      const { start, end } = req.query;
      const payments = await db.readTable('payments');
      
      const filteredPayments = payments.filter(payment => {
        const paymentDate = new Date(payment.createdAt);
        return (!start || paymentDate >= new Date(start)) && 
               (!end || paymentDate <= new Date(end));
      });
      
      const total = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
      
      // Group by method
      const byMethod = {};
      filteredPayments.forEach(payment => {
        if (!byMethod[payment.method]) {
          byMethod[payment.method] = 0;
        }
        byMethod[payment.method] += payment.amount;
      });
      
      res.json({
        success: true,
        data: {
          count: filteredPayments.length,
          total,
          byMethod
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete payment
  async deletePayment(req, res, next) {
    try {
      const payment = await db.findById('payments', req.params.id);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }
      await db.delete('payments', req.params.id);
      res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = paymentController;