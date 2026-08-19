const { db } = require('../services/jsonDatabase');
const { validateRequired } = require('../utils/validators');

const categoryController = {
  // Get all categories
  async getAllCategories(req, res, next) {
    try {
      const categories = await db.readTable('categories');
      const products = await db.readTable('products');
      
      const categoriesWithCount = categories.map(category => ({
        ...category,
        productCount: products.filter(p => p.categoryId === category.id).length
      }));
      
      res.json({ success: true, data: categoriesWithCount });
    } catch (error) {
      next(error);
    }
  },

  // Get single category
  async getCategory(req, res, next) {
    try {
      const category = await db.findById('categories', req.params.id);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      const products = await db.readTable('products');
      const categoryProducts = products.filter(p => p.categoryId === category.id);
      
      res.json({
        success: true,
        data: {
          ...category,
          productCount: categoryProducts.length
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get category products
  async getCategoryProducts(req, res, next) {
    try {
      const category = await db.findById('categories', req.params.id);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      const products = await db.readTable('products');
      const categoryProducts = products.filter(p => p.categoryId === category.id);
      
      res.json({ success: true, data: categoryProducts });
    } catch (error) {
      next(error);
    }
  },

  // Get category product count
  async getCategoryProductCount(req, res, next) {
    try {
      const products = await db.readTable('products');
      const count = products.filter(p => p.categoryId === req.params.id).length;
      
      res.json({ success: true, count });
    } catch (error) {
      next(error);
    }
  },

  // Create category
  async createCategory(req, res, next) {
    try {
      const { name, description } = req.body;
      
      validateRequired(name, 'Category name');
      
      const existingCategory = await db.findOne('categories', { name });
      if (existingCategory) {
        return res.status(400).json({ message: 'Category already exists' });
      }
      
      const category = await db.create('categories', {
        name,
        description: description || '',
        active: true
      });
      
      res.status(201).json({
        success: true,
        data: category,
        message: 'Category created successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Update category
  async updateCategory(req, res, next) {
    try {
      const category = await db.findById('categories', req.params.id);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      // Check name uniqueness
      if (req.body.name && req.body.name !== category.name) {
        const existingCategory = await db.findOne('categories', { name: req.body.name });
        if (existingCategory) {
          return res.status(400).json({ message: 'Category name already exists' });
        }
      }
      
      const updatedCategory = await db.update('categories', req.params.id, req.body);
      res.json({
        success: true,
        data: updatedCategory,
        message: 'Category updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Toggle category status
  async toggleCategoryStatus(req, res, next) {
    try {
      const category = await db.findById('categories', req.params.id);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      const updatedCategory = await db.update('categories', req.params.id, {
        active: !category.active
      });
      
      res.json({
        success: true,
        data: updatedCategory,
        message: `Category ${updatedCategory.active ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete category
  async deleteCategory(req, res, next) {
    try {
      const category = await db.findById('categories', req.params.id);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      // Check if category has products
      const products = await db.find('products', { categoryId: req.params.id });
      if (products.length > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete category with associated products. Move products to another category first.' 
        });
      }
      
      await db.delete('categories', req.params.id);
      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Bulk delete categories
  async bulkDeleteCategories(req, res, next) {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Category IDs array is required' });
      }
      
      let deletedCount = 0;
      const errors = [];
      
      for (const id of ids) {
        try {
          const products = await db.find('products', { categoryId: id });
          if (products.length > 0) {
            errors.push({ id, error: 'Category has associated products' });
            continue;
          }
          
          await db.delete('categories', id);
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
  }
};

module.exports = categoryController;