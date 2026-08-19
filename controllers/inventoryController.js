const { db } = require('../services/jsonDatabase');
const stockService = require('../services/stockService');

const inventoryController = {
  // Get inventory summary
  async getInventorySummary(req, res, next) {
    try {
      const products = await db.readTable('products');
      
      const summary = {
        totalProducts: products.length,
        totalQuantity: products.reduce((sum, p) => sum + p.quantity, 0),
        totalValue: products.reduce((sum, p) => sum + (p.quantity * p.costPrice), 0),
        totalRetailValue: products.reduce((sum, p) => sum + (p.quantity * p.price), 0),
        lowStock: products.filter(p => p.quantity <= p.reorderLevel && p.quantity > 0).length,
        outOfStock: products.filter(p => p.quantity <= 0).length
      };
      
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  },

  // Get stock movements
  async getStockMovements(req, res, next) {
    try {
      const movements = await db.readTable('stock-movements');
      movements.sort((a, b) => new Date(b.date) - new Date(a.date));
      res.json({ success: true, data: movements });
    } catch (error) {
      next(error);
    }
  },

  // Get recent movements
  async getRecentMovements(req, res, next) {
    try {
      const movements = await db.readTable('stock-movements');
      movements.sort((a, b) => new Date(b.date) - new Date(a.date));
      res.json({ success: true, data: movements.slice(0, 50) });
    } catch (error) {
      next(error);
    }
  },

  // Get low stock products
  async getLowStockProducts(req, res, next) {
    try {
      const products = await stockService.getLowStockProducts();
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  },

  // Get out of stock products
  async getOutOfStockProducts(req, res, next) {
    try {
      const products = await db.readTable('products');
      const outOfStock = products.filter(p => p.quantity <= 0);
      res.json({ success: true, data: outOfStock });
    } catch (error) {
      next(error);
    }
  },

  // Get inventory value
  async getInventoryValue(req, res, next) {
    try {
      const products = await db.readTable('products');
      const value = products.reduce((sum, p) => sum + (p.quantity * p.costPrice), 0);
      res.json({ success: true, data: { value } });
    } catch (error) {
      next(error);
    }
  },

  // Get product inventory
  async getProductInventory(req, res, next) {
    try {
      const product = await db.findById('products', req.params.productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      res.json({
        success: true,
        data: {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: product.quantity,
          reorderLevel: product.reorderLevel,
          status: product.quantity <= 0 ? 'out-of-stock' : 
                  product.quantity <= product.reorderLevel ? 'low-stock' : 'in-stock'
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get product movements
  async getProductMovements(req, res, next) {
    try {
      const movements = await stockService.getStockMovements(req.params.productId);
      res.json({ success: true, data: movements });
    } catch (error) {
      next(error);
    }
  },

  // Adjust stock
  async adjustStock(req, res, next) {
    try {
      const { productId, newQuantity, reason } = req.body;
      
      if (!productId || newQuantity === undefined) {
        return res.status(400).json({ message: 'Product ID and new quantity are required' });
      }
      
      const product = await stockService.adjustStock(productId, newQuantity, reason);
      res.json({
        success: true,
        data: product,
        message: 'Stock adjusted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Transfer stock
  async transferStock(req, res, next) {
    try {
      const { fromProductId, toProductId, quantity, reason } = req.body;
      
      if (!fromProductId || !toProductId || !quantity) {
        return res.status(400).json({ message: 'Source, destination, and quantity are required' });
      }
      
      await stockService.decreaseStock(fromProductId, quantity, 'transfer_out', reason);
      await stockService.increaseStock(toProductId, quantity, 'transfer_in', reason);
      
      res.json({ message: 'Stock transferred successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Stock count
  async stockCount(req, res, next) {
    try {
      const { counts } = req.body;
      
      if (!Array.isArray(counts) || counts.length === 0) {
        return res.status(400).json({ message: 'Counts array is required' });
      }
      
      const results = [];
      
      for (const count of counts) {
        const { productId, countedQuantity } = count;
        const product = await db.findById('products', productId);
        
        if (!product) {
          results.push({ productId, error: 'Product not found' });
          continue;
        }
        
        const difference = countedQuantity - product.quantity;
        
        if (difference !== 0) {
          await stockService.adjustStock(
            productId, 
            countedQuantity, 
            `Stock count adjustment (difference: ${difference})`
          );
        }
        
        results.push({
          productId,
          expected: product.quantity,
          counted: countedQuantity,
          difference
        });
      }
      
      res.json({
        success: true,
        data: results,
        message: 'Stock count completed successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Create reorder request
  async createReorderRequest(req, res, next) {
    try {
      const { productId, quantity, supplierId } = req.body;
      
      if (!productId || !quantity) {
        return res.status(400).json({ message: 'Product ID and quantity are required' });
      }
      
      const product = await db.findById('products', productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Create notification for reorder
      await db.create('notifications', {
        type: 'reorder',
        title: 'Reorder Request',
        message: `Reorder ${quantity} units of ${product.name}`,
        read: false,
        priority: 'high'
      });
      
      res.json({
        success: true,
        message: 'Reorder request created successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Clear inventory
  async clearInventory(req, res, next) {
    try {
      const products = await db.readTable('products');
      
      for (const product of products) {
        if (product.quantity > 0) {
          await stockService.adjustStock(product.id, 0, 'Inventory cleared');
        }
      }
      
      res.json({ message: 'Inventory cleared successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Delete movement
  async deleteMovement(req, res, next) {
    try {
      const movement = await db.findById('stock-movements', req.params.id);
      if (!movement) {
        return res.status(404).json({ message: 'Movement not found' });
      }
      
      await db.delete('stock-movements', req.params.id);
      res.json({ message: 'Movement deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = inventoryController;