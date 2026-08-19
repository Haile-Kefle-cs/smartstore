const { v4: uuidv4 } = require('uuid');

const generateUUID = () => {
  return uuidv4();
};

const generateId = (prefix = '') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

const generateOrderNumber = (type = 'ORD') => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${type}-${year}${month}${day}-${random}`;
};

const generateSKU = (categoryCode, productName) => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const namePart = productName.substring(0, 3).toUpperCase();
  return `${categoryCode}-${namePart}-${timestamp}`;
};

const generateBarcode = () => {
  let barcode = '';
  for (let i = 0; i < 12; i++) {
    barcode += Math.floor(Math.random() * 10);
  }
  return barcode;
};

const generateToken = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

module.exports = {
  generateUUID,
  generateId,
  generateOrderNumber,
  generateSKU,
  generateBarcode,
  generateToken
};