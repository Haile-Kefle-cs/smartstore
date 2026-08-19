const { db } = require('./jsonDatabase');
const { calculateTotal } = require('../utils/calculations');
const { generateOrderNumber } = require('../utils/idGenerator');
const stockService = require('./stockService');

const saleService = {
  async createSale(saleData, userId) {
    const { customerId, items, discountPercent = 0, paymentMethod = 'cash', notes = '' } = saleData;

    if (!items || items.length === 0) {
      throw new Error('Sale must have at least one item');
    }

    // Validate and prepare items
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await db.findById('products', item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      if (!product.active) {
        throw new Error(`Product ${product.name} is inactive`);
      }

      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.quantity}`);
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

    // Create sale record
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
      createdBy: userId
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
      reference: sale.orderNumber,
      createdBy: userId
    });

    // Update customer statistics
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

    return sale;
  },

  async refundSale(saleId, userId) {
    const sale = await db.findById('sales', saleId);
    if (!sale) {
      throw new Error('Sale not found');
    }

    if (sale.status === 'refunded') {
      throw new Error('Sale already refunded');
    }

    // Return items to stock
    for (const item of sale.items) {
      await stockService.increaseStock(item.productId, item.quantity, 'refund', sale.id);
    }

    // Update sale status
    await db.update('sales', saleId, {
      status: 'refunded',
      paymentStatus: 'refunded'
    });

    // Create refund payment record
    await db.create('payments', {
      saleId: sale.id,
      amount: -sale.total,
      method: 'refund',
      status: 'refunded',
      reference: `REFUND-${sale.orderNumber}`,
      createdBy: userId
    });

    // Create notification
    await db.create('notifications', {
      type: 'refund',
      title: 'Sale Refunded',
      message: `Sale ${sale.orderNumber} has been refunded`,
      read: false,
      priority: 'high'
    });

    return sale;
  },

  async getSaleWithDetails(saleId) {
    const sale = await db.findById('sales', saleId);
    if (!sale) {
      throw new Error('Sale not found');
    }

    const customer = sale.customerId 
      ? await db.findById('customers', sale.customerId)
      : null;

    const createdBy = sale.createdBy
      ? await db.findById('users', sale.createdBy)
      : null;

    return {
      ...sale,
      customerName: customer?.name || 'Walk-in Customer',
      customerEmail: customer?.email || '',
      createdByName: createdBy?.name || 'Unknown'
    };
  },

  async getSalesByDateRange(startDate, endDate) {
    const sales = await db.readTable('sales');
    return sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
    });
  },

  async getSalesSummary(startDate, endDate) {
    const sales = await this.getSalesByDateRange(startDate, endDate);
    
    const summary = {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, sale) => sum + sale.total, 0),
      totalTax: sales.reduce((sum, sale) => sum + sale.tax, 0),
      totalDiscount: sales.reduce((sum, sale) => sum + sale.discount, 0),
      averageOrderValue: sales.length > 0 
        ? sales.reduce((sum, sale) => sum + sale.total, 0) / sales.length 
        : 0
    };

    return summary;
  }
};

module.exports = saleService;