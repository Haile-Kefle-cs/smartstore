const calculateSubtotal = (items) => {
  return items.reduce((sum, item) => {
    return sum + (item.quantity * item.price);
  }, 0);
};

const calculateTax = (subtotal, taxRate) => {
  return subtotal * (taxRate / 100);
};

const calculateDiscount = (subtotal, discountPercent) => {
  return subtotal * (discountPercent / 100);
};

const calculateTotal = (items, taxRate = 0, discountPercent = 0) => {
  const subtotal = calculateSubtotal(items);
  const tax = calculateTax(subtotal, taxRate);
  const discount = calculateDiscount(subtotal, discountPercent);
  return {
    subtotal,
    tax,
    discount,
    total: subtotal + tax - discount
  };
};

const calculateProfit = (salePrice, costPrice) => {
  return salePrice - costPrice;
};

const calculateProfitMargin = (salePrice, costPrice) => {
  if (salePrice === 0) return 0;
  return ((salePrice - costPrice) / salePrice) * 100;
};

const calculateAverageOrderValue = (totalRevenue, orderCount) => {
  if (orderCount === 0) return 0;
  return totalRevenue / orderCount;
};

const calculateGrowthRate = (currentValue, previousValue) => {
  if (previousValue === 0) return currentValue > 0 ? 100 : 0;
  return ((currentValue - previousValue) / previousValue) * 100;
};

const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

const roundTo = (value, decimals = 2) => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

const calculateLoyaltyPoints = (amount, pointsPerDollar = 1) => {
  return Math.floor(amount * pointsPerDollar);
};

module.exports = {
  calculateSubtotal,
  calculateTax,
  calculateDiscount,
  calculateTotal,
  calculateProfit,
  calculateProfitMargin,
  calculateAverageOrderValue,
  calculateGrowthRate,
  calculatePercentage,
  roundTo,
  calculateLoyaltyPoints
};