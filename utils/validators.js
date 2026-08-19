const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

const validatePhone = (phone) => {
  const re = /^[\d\s\-+()]{10,}$/;
  return re.test(phone);
};

const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    throw new Error(`${fieldName} is required`);
  }
  return true;
};

const validateNumber = (value, fieldName) => {
  if (value === undefined || value === null || isNaN(value)) {
    throw new Error(`${fieldName} must be a number`);
  }
  return true;
};

const validatePositiveNumber = (value, fieldName) => {
  if (isNaN(value) || value < 0) {
    throw new Error(`${fieldName} must be a positive number`);
  }
  return true;
};

const validateInteger = (value, fieldName) => {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  return true;
};

const validateDate = (value, fieldName) => {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }
  return true;
};

const validateLength = (value, fieldName, min, max) => {
  if (value.length < min || value.length > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max} characters`);
  }
  return true;
};

const validateEnum = (value, fieldName, allowedValues) => {
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
  return true;
};

const validateSKU = (sku) => {
  const re = /^[A-Z0-9-]+$/;
  return re.test(sku);
};

const validateBarcode = (barcode) => {
  const re = /^\d{8,14}$/;
  return re.test(barcode);
};

module.exports = {
  validateEmail,
  validatePassword,
  validatePhone,
  validateRequired,
  validateNumber,
  validatePositiveNumber,
  validateInteger,
  validateDate,
  validateLength,
  validateEnum,
  validateSKU,
  validateBarcode
};