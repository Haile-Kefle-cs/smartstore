const { db } = require('../services/jsonDatabase');
const { validateRequired, validateNumber } = require('../utils/validators');
const { generateId } = require('../utils/idGenerator');
const stockService = require('../services/stockService');

const productController = {
  // Get all products
  async getAllProducts(req, res, next) {
    try {
      const { category, status, search, sortBy, order = 'asc', page = 1, limit = 50 } = req.query;
      
      let products = await db.readTable('products');
      
      // Filter by category
      if (category) {
        products = products.filter(p => p.categoryId === category);
      }
      
      // Filter by status
      if (status) {
        products = products.filter(p => p.active === (status === 'active'));
      }
      
      // Search
      if (search) {
        const searchLower = search.toLowerCase();
        products = products.filter(p => 
          p.name.toLowerCase().includes(searchLower) ||
          p.sku.toLowerCase().includes(searchLower) ||
          p.barcode?.toLowerCase().includes(searchLower)
        );
      }
      
      // Sort
      if (sortBy) {
        products.sort((a, b) => {
          if (order === 'desc') {
            return (b[sortBy] || '') > (a[sortBy] || '') ? 1 : -1;
          }
          return (a[sortBy] || '') > (b[sortBy] || '') ? 1 : -1;
        });
      }
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedProducts = products.slice(startIndex, endIndex);
      
      // Add category name
      const categories = await db.readTable('categories');
      const productsWithCategory = paginatedProducts.map(product => ({
        ...product,
        categoryName: categories.find(c => c.id === product.categoryId)?.name || 'Uncategorized',
        status: product.active ? 'active' : 'inactive',
        stockStatus: product.quantity <= 0 ? 'out-of-stock' : 
                     product.quantity <= product.reorderLevel ? 'low-stock' : 'in-stock'
      }));
      
      res.json({
        success: true,
        data: productsWithCategory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: products.length,
          pages: Math.ceil(products.length / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get single product
  async getProduct(req, res, next) {
    try {
      const product = await db.findById('products', req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      const categories = await db.readTable('categories');
      const category = categories.find(c => c.id === product.categoryId);
      
      res.json({
        success: true,
        data: {
          ...product,
          categoryName: category?.name || 'Uncategorized',
          stockStatus: product.quantity <= 0 ? 'out-of-stock' : 
                       product.quantity <= product.reorderLevel ? 'low-stock' : 'in-stock'
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get product by SKU
  async getProductBySku(req, res, next) {
    try {
      const product = await db.findOne('products', { sku: req.params.sku });
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  },

  // Get product by barcode
  async getProductByBarcode(req, res, next) {
    try {
      const product = await db.findOne('products', { barcode: req.params.barcode });
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  },

  // Create product
  async createProduct(req, res, next) {
    try {
      const { name, sku, categoryId, description, price, costPrice, quantity, reorderLevel, barcode } = req.body;

      // Validation
      validateRequired(name, 'Product name');
      validateRequired(sku, 'SKU');
      validateNumber(price, 'Price');
      validateNumber(costPrice, 'Cost price');
      
      if (price <= costPrice) {
        return res.status(400).json({ message: 'Price must be greater than cost price' });
      }

      // Check for existing SKU
      const existingSku = await db.findOne('products', { sku });
      if (existingSku) {
        return res.status(400).json({ message: 'SKU already exists' });
      }

      // Check for existing barcode
      if (barcode) {
        const existingBarcode = await db.findOne('products', { barcode });
        if (existingBarcode) {
          return res.status(400).json({ message: 'Barcode already exists' });
        }
      }

      const product = await db.create('products', {
        name,
        sku,
        categoryId,
        description: description || '',
        price: parseFloat(price),
        costPrice: parseFloat(costPrice),
        quantity: parseInt(quantity) || 0,
        reorderLevel: parseInt(reorderLevel) || 10,
        barcode: barcode || '',
        active: true
      });

      // Create initial stock movement if quantity > 0
      if (product.quantity > 0) {
        await db.create('stock-movements', {
          productId: product.id,
          type: 'initial',
          quantity: product.quantity,
          balance: product.quantity,
          referenceId: product.id,
          date: new Date().toISOString()
        });
      }

      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Bulk create products
  async bulkCreateProducts(req, res, next) {
    try {
      const { products } = req.body;
      
      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ message: 'Products array is required' });
      }

      const createdProducts = [];
      const errors = [];

      for (const productData of products) {
        try {
          const { name, sku, price, costPrice } = productData;
          
          if (!name || !sku || price === undefined || costPrice === undefined) {
            errors.push({ sku: sku || 'unknown', error: 'Missing required fields' });
            continue;
          }

          const existingSku = await db.findOne('products', { sku });
          if (existingSku) {
            errors.push({ sku, error: 'SKU already exists' });
            continue;
          }

          const product = await db.create('products', {
            ...productData,
            quantity: parseInt(productData.quantity) || 0,
            reorderLevel: parseInt(productData.reorderLevel) || 10,
            active: true
          });

          createdProducts.push(product);
        } catch (error) {
          errors.push({ sku: productData.sku || 'unknown', error: error.message });
        }
      }

      res.status(201).json({
        success: true,
        created: createdProducts.length,
        errors,
        data: createdProducts
      });
    } catch (error) {
      next(error);
    }
  },

  // Update product
  async updateProduct(req, res, next) {
    try {
      const product = await db.findById('products', req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Check SKU uniqueness
      if (req.body.sku && req.body.sku !== product.sku) {
        const existingSku = await db.findOne('products', { sku: req.body.sku });
        if (existingSku) {
          return res.status(400).json({ message: 'SKU already exists' });
        }
      }

      const updatedProduct = await db.update('products', req.params.id, req.body);
      res.json({
        success: true,
        data: updatedProduct,
        message: 'Product updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Update stock
  async updateStock(req, res, next) {
    try {
      const { quantity, type, reason } = req.body;
      
      if (quantity === undefined) {
        return res.status(400).json({ message: 'Quantity is required' });
      }

      const product = await db.findById('products', req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      let updatedProduct;
      if (type === 'increase') {
        updatedProduct = await stockService.increaseStock(product.id, quantity, 'adjustment', reason);
      } else if (type === 'decrease') {
        updatedProduct = await stockService.decreaseStock(product.id, quantity, 'adjustment', reason);
      } else {
        updatedProduct = await stockService.adjustStock(product.id, quantity, reason);
      }

      res.json({
        success: true,
        data: updatedProduct,
        message: 'Stock updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Update price
  async updatePrice(req, res, next) {
    try {
      const { price, costPrice } = req.body;
      
      if (!price || !costPrice) {
        return res.status(400).json({ message: 'Price and cost price are required' });
      }

      if (price <= costPrice) {
        return res.status(400).json({ message: 'Price must be greater than cost price' });
      }

      const product = await db.update('products', req.params.id, {
        price: parseFloat(price),
        costPrice: parseFloat(costPrice)
      });

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json({
        success: true,
        data: product,
        message: 'Price updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Toggle product status
  async toggleProductStatus(req, res, next) {
    try {
      const product = await db.findById('products', req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const updatedProduct = await db.update('products', req.params.id, {
        active: !product.active
      });

      res.json({
        success: true,
        data: updatedProduct,
        message: `Product ${updatedProduct.active ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete product
  async deleteProduct(req, res, next) {
    try {
      const product = await db.findById('products', req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Check if product has sales or purchases
      const sales = await db.find('sales', {});
      const hasSales = sales.some(sale => 
        sale.items.some(item => item.productId === product.id)
      );

      if (hasSales) {
        return res.status(400).json({ 
          message: 'Cannot delete product with existing sales. Consider deactivating instead.' 
        });
      }

      await db.delete('products', req.params.id);
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Bulk delete products
  async bulkDeleteProducts(req, res, next) {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Product IDs array is required' });
      }

      const deletedCount = 0;
      const errors = [];

      for (const id of ids) {
        try {
          await db.delete('products', id);
          deletedCount++;
        } catch (error) {
          errors.push({ id, error: error.message });
        }
      }

      res.json({
        success: true,
        deleted: deletedCount,
        errors
      });
    } catch (error) {
      next(error);
    }
  },

  // Get low stock products
  async getLowStockProducts(req, res, next) {
    try {
      const products = await db.readTable('products');
      const lowStock = products.filter(p => 
        p.active && p.quantity <= p.reorderLevel && p.quantity > 0
      );
      res.json({ success: true, data: lowStock });
    } catch (error) {
      next(error);
    }
  },

  // Get out of stock products
  async getOutOfStockProducts(req, res, next) {
    try {
      const products = await db.readTable('products');
      const outOfStock = products.filter(p => p.active && p.quantity <= 0);
      res.json({ success: true, data: outOfStock });
    } catch (error) {
      next(error);
    }
  },

  // Search products
  async searchProducts(req, res, next) {
    try {
      const { q } = req.query;
      
      if (!q) {
        return res.status(400).json({ message: 'Search query is required' });
      }

      const products = await db.readTable('products');
      const searchLower = q.toLowerCase();
      
      const results = products.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        product.sku.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.barcode?.toLowerCase().includes(searchLower)
      );

      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = productController;