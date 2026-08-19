const { db } = require('./jsonDatabase');
const { generateOrderNumber } = require('../utils/idGenerator');
const stockService = require('./stockService');

const purchaseService = {
  async createPurchase(purchaseData, userId) {
    const { supplierId, items, notes = '' } = purchaseData;

    if (!supplierId) {
      throw new Error('Supplier is required');
    }

    if (!items || items.length === 0) {
      throw new Error('Purchase must have at least one item');
    }

    // Validate supplier exists
    const supplier = await db.findById('suppliers', supplierId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    // Validate and prepare items
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await db.findById('products', item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
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

    // Create purchase record
    const purchase = await db.create('purchases', {
      orderNumber: generateOrderNumber('PO'),
      supplierId,
      items: validatedItems,
      subtotal,
      tax: 0,
      total: subtotal,
      status: 'pending',
      notes,
      createdBy: userId
    });

    return purchase;
  },

  async receivePurchase(purchaseId, userId) {
    const purchase = await db.findById('purchases', purchaseId);
    if (!purchase) {
      throw new Error('Purchase not found');
    }

    if (purchase.status === 'received') {
      throw new Error('Purchase already received');
    }

    // Update stock for each item
    for (const item of purchase.items) {
      await stockService.increaseStock(item.productId, item.quantity, 'purchase', purchase.id);
    }

    // Update purchase status
    const updatedPurchase = await db.update('purchases', purchaseId, {
      status: 'received',
      receivedAt: new Date().toISOString(),
      receivedBy: userId
    });

    // Create notification
    await db.create('notifications', {
      type: 'purchase',
      title: 'Purchase Received',
      message: `Purchase ${purchase.orderNumber} has been received`,
      read: false,
      priority: 'info'
    });

    return updatedPurchase;
  },

  async cancelPurchase(purchaseId, userId) {
    const purchase = await db.findById('purchases', purchaseId);
    if (!purchase) {
      throw new Error('Purchase not found');
    }

    if (purchase.status === 'received') {
      throw new Error('Cannot cancel received purchase');
    }

    const updatedPurchase = await db.update('purchases', purchaseId, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: userId
    });

    return updatedPurchase;
  },

  async getPurchaseWithDetails(purchaseId) {
    const purchase = await db.findById('purchases', purchaseId);
    if (!purchase) {
      throw new Error('Purchase not found');
    }

    const supplier = await db.findById('suppliers', purchase.supplierId);
    const createdBy = await db.findById('users', purchase.createdBy);

    return {
      ...purchase,
      supplierName: supplier?.companyName || 'Unknown Supplier',
      supplierEmail: supplier?.email || '',
      createdByName: createdBy?.name || 'Unknown'
    };
  }
};

module.exports = purchaseService;