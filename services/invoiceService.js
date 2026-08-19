const { db } = require('./jsonDatabase');

const invoiceService = {
  async generateInvoice(saleId) {
    const sale = await db.findById('sales', saleId);
    if (!sale) {
      throw new Error('Sale not found');
    }

    const settings = await db.findOne('settings', {});
    const customer = sale.customerId 
      ? await db.findById('customers', sale.customerId)
      : null;

    return {
      invoiceNumber: sale.orderNumber,
      date: sale.createdAt,
      storeInfo: {
        name: settings?.storeName || 'SmartStore',
        address: settings?.address || '',
        city: settings?.city || '',
        state: settings?.state || '',
        zipCode: settings?.zipCode || '',
        phone: settings?.phone || '',
        email: settings?.email || ''
      },
      customer: customer ? {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address
      } : null,
      items: sale.items,
      subtotal: sale.subtotal,
      tax: sale.tax,
      discount: sale.discount,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      footer: settings?.receiptFooter || 'Thank you for your business!'
    };
  },

  async generatePurchaseOrder(purchaseId) {
    const purchase = await db.findById('purchases', purchaseId);
    if (!purchase) {
      throw new Error('Purchase not found');
    }

    const settings = await db.findOne('settings', {});
    const supplier = purchase.supplierId 
      ? await db.findById('suppliers', purchase.supplierId)
      : null;

    return {
      poNumber: purchase.orderNumber,
      date: purchase.createdAt,
      storeInfo: {
        name: settings?.storeName || 'SmartStore',
        address: settings?.address || '',
        phone: settings?.phone || '',
        email: settings?.email || ''
      },
      supplier: supplier ? {
        companyName: supplier.companyName,
        contactPerson: supplier.contactPerson,
        email: supplier.email,
        phone: supplier.phone
      } : null,
      items: purchase.items,
      subtotal: purchase.subtotal,
      tax: purchase.tax,
      total: purchase.total,
      status: purchase.status
    };
  },

  async generateReceipt(saleId) {
    const invoice = await this.generateInvoice(saleId);
    return {
      ...invoice,
      receiptNumber: invoice.invoiceNumber,
      printedAt: new Date().toISOString()
    };
  }
};

module.exports = invoiceService;