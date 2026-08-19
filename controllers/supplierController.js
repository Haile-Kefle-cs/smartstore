const { db } = require('../services/jsonDatabase');
const { validateRequired, validateEmail, validatePhone } = require('../utils/validators');

const supplierController = {
  // Get all suppliers
  async getAllSuppliers(req, res, next) {
    try {
      const suppliers = await db.readTable('suppliers');
      const products = await db.readTable('products');
      
      const suppliersWithCount = suppliers.map(supplier => ({
        ...supplier,
        productCount: products.filter(p => p.supplierId === supplier.id).length
      }));
      
      res.json({ success: true, data: suppliersWithCount });
    } catch (error) {
      next(error);
    }
  },

  // Search suppliers
  async searchSuppliers(req, res, next) {
    try {
      const { q } = req.query;
      const suppliers = await db.readTable('suppliers');
      
      const results = suppliers.filter(supplier =>
        supplier.companyName.toLowerCase().includes(q.toLowerCase()) ||
        supplier.contactPerson.toLowerCase().includes(q.toLowerCase()) ||
        supplier.email.toLowerCase().includes(q.toLowerCase())
      );
      
      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  },

  // Get single supplier
  async getSupplier(req, res, next) {
    try {
      const supplier = await db.findById('suppliers', req.params.id);
      if (!supplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }
      res.json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  },

  // Get supplier products
  async getSupplierProducts(req, res, next) {
    try {
      const products = await db.find('products', { supplierId: req.params.id });
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  },

  // Get supplier purchases
  async getSupplierPurchases(req, res, next) {
    try {
      const purchases = await db.find('purchases', { supplierId: req.params.id });
      res.json({ success: true, data: purchases });
    } catch (error) {
      next(error);
    }
  },

  // Create supplier
  async createSupplier(req, res, next) {
    try {
      const { companyName, contactPerson, email, phone, address, paymentTerms } = req.body;
      
      validateRequired(companyName, 'Company name');
      validateRequired(contactPerson, 'Contact person');
      
      if (email && !validateEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      
      if (phone && !validatePhone(phone)) {
        return res.status(400).json({ message: 'Invalid phone number' });
      }
      
      const supplier = await db.create('suppliers', {
        companyName,
        contactPerson,
        email: email || '',
        phone: phone || '',
        address: address || '',
        paymentTerms: paymentTerms || 'Net 30',
        active: true
      });
      
      res.status(201).json({
        success: true,
        data: supplier,
        message: 'Supplier created successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Update supplier
  async updateSupplier(req, res, next) {
    try {
      const supplier = await db.update('suppliers', req.params.id, req.body);
      if (!supplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }
      res.json({
        success: true,
        data: supplier,
        message: 'Supplier updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Toggle supplier status
  async toggleSupplierStatus(req, res, next) {
    try {
      const supplier = await db.findById('suppliers', req.params.id);
      if (!supplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }
      
      const updatedSupplier = await db.update('suppliers', req.params.id, {
        active: !supplier.active
      });
      
      res.json({
        success: true,
        data: updatedSupplier,
        message: `Supplier ${updatedSupplier.active ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete supplier
  async deleteSupplier(req, res, next) {
    try {
      const purchases = await db.find('purchases', { supplierId: req.params.id });
      if (purchases.length > 0) {
        return res.status(400).json({ message: 'Cannot delete supplier with purchase history' });
      }
      
      await db.delete('suppliers', req.params.id);
      res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Bulk delete suppliers
  async bulkDeleteSuppliers(req, res, next) {
    try {
      const { ids } = req.body;
      let deletedCount = 0;
      
      for (const id of ids) {
        await db.delete('suppliers', id);
        deletedCount++;
      }
      
      res.json({ success: true, deleted: deletedCount });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = supplierController;