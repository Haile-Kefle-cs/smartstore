const { db } = require('./jsonDatabase');

const stockService = {
  async increaseStock(productId, quantity, type = 'purchase', referenceId = null) {
    const product = await db.findById('products', productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    const newQuantity = product.quantity + parseInt(quantity);
    const updatedProduct = await db.update('products', productId, {
      quantity: newQuantity
    });

    await db.create('stock-movements', {
      productId,
      type,
      quantity: parseInt(quantity),
      balance: newQuantity,
      referenceId,
      date: new Date().toISOString()
    });

    return updatedProduct;
  },

  async decreaseStock(productId, quantity, type = 'sale', referenceId = null) {
    const product = await db.findById('products', productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    if (product.quantity < quantity) {
      throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.quantity}`);
    }

    const newQuantity = product.quantity - parseInt(quantity);
    const updatedProduct = await db.update('products', productId, {
      quantity: newQuantity
    });

    await db.create('stock-movements', {
      productId,
      type,
      quantity: -parseInt(quantity),
      balance: newQuantity,
      referenceId,
      date: new Date().toISOString()
    });

    // Check if stock is below reorder level
    if (newQuantity <= product.reorderLevel) {
      await this.createLowStockNotification(updatedProduct);
    }

    return updatedProduct;
  },

  async adjustStock(productId, newQuantity, reason = '') {
    const product = await db.findById('products', productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (newQuantity < 0) {
      throw new Error('Quantity cannot be negative');
    }

    const difference = parseInt(newQuantity) - product.quantity;
    const updatedProduct = await db.update('products', productId, {
      quantity: parseInt(newQuantity)
    });

    await db.create('stock-movements', {
      productId,
      type: 'adjustment',
      quantity: difference,
      balance: parseInt(newQuantity),
      reason,
      date: new Date().toISOString()
    });

    if (parseInt(newQuantity) <= product.reorderLevel) {
      await this.createLowStockNotification(updatedProduct);
    }

    return updatedProduct;
  },

  async getStockMovements(productId = null, limit = 100) {
    const movements = productId 
      ? await db.find('stock-movements', { productId })
      : await db.readTable('stock-movements');
    
    return movements
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
  },

  async getLowStockProducts() {
    const products = await db.readTable('products');
    return products.filter(p => 
      p.active && 
      p.quantity <= p.reorderLevel && 
      p.quantity > 0
    );
  },

  async getOutOfStockProducts() {
    const products = await db.readTable('products');
    return products.filter(p => p.active && p.quantity <= 0);
  },

  async getStockValue() {
    const products = await db.readTable('products');
    return products.reduce((sum, p) => sum + (p.quantity * p.costPrice), 0);
  },

  async createLowStockNotification(product) {
    const existingNotification = await db.findOne('notifications', {
      type: 'low_stock',
      productId: product.id,
      read: false
    });

    if (!existingNotification) {
      await db.create('notifications', {
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `Product ${product.name} is running low (${product.quantity} remaining)`,
        productId: product.id,
        read: false,
        priority: 'high',
        createdAt: new Date().toISOString()
      });
    }
  },

  async transferStock(fromProductId, toProductId, quantity, reason = '') {
    await this.decreaseStock(fromProductId, quantity, 'transfer_out', reason);
    await this.increaseStock(toProductId, quantity, 'transfer_in', reason);
  },

  async getStockHistory(productId, startDate = null, endDate = null) {
    let movements = await db.find('stock-movements', { productId });
    
    if (startDate) {
      movements = movements.filter(m => new Date(m.date) >= new Date(startDate));
    }
    
    if (endDate) {
      movements = movements.filter(m => new Date(m.date) <= new Date(endDate));
    }
    
    return movements.sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  async getInventorySummary() {
    const products = await db.readTable('products');
    
    return {
      totalProducts: products.length,
      totalQuantity: products.reduce((sum, p) => sum + p.quantity, 0),
      totalValue: products.reduce((sum, p) => sum + (p.quantity * p.costPrice), 0),
      totalRetailValue: products.reduce((sum, p) => sum + (p.quantity * p.price), 0),
      lowStockCount: products.filter(p => p.quantity <= p.reorderLevel && p.quantity > 0).length,
      outOfStockCount: products.filter(p => p.quantity <= 0).length
    };
  }
};

module.exports = stockService;