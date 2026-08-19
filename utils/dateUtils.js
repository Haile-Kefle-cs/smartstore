const formatDate = (date, format = 'YYYY-MM-DD') => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const monthName = d.toLocaleString('default', { month: 'short' });
  const monthFullName = d.toLocaleString('default', { month: 'long' });
  const dayName = d.toLocaleString('default', { weekday: 'short' });
  const dayFullName = d.toLocaleString('default', { weekday: 'long' });

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'YYYY-MM-DD HH:mm':
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    case 'YYYY-MM-DD HH:mm:ss':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD-MM-YYYY':
      return `${day}-${month}-${year}`;
    case 'MMM DD, YYYY':
      return `${monthName} ${day}, ${year}`;
    case 'MMMM DD, YYYY':
      return `${monthFullName} ${day}, ${year}`;
    case 'DD MMM YYYY':
      return `${day} ${monthName} ${year}`;
    case 'DD MMMM YYYY':
      return `${day} ${monthFullName} ${year}`;
    case 'HH:mm':
      return `${hours}:${minutes}`;
    case 'HH:mm:ss':
      return `${hours}:${minutes}:${seconds}`;
    case 'ddd, MMM DD':
      return `${dayName}, ${monthName} ${day}`;
    case 'dddd, MMMM DD':
      return `${dayFullName}, ${monthFullName} ${day}`;
    default:
      return `${year}-${month}-${day}`;
  }
};

const getStartOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const getStartOfWeek = (date = new Date()) => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfWeek = (date = new Date()) => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
};

const getStartOfMonth = (date = new Date()) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfMonth = (date = new Date()) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
};

const getStartOfYear = (date = new Date()) => {
  const d = new Date(date);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfYear = (date = new Date()) => {
  const d = new Date(date);
  d.setMonth(11, 31);
  d.setHours(23, 59, 59, 999);
  return d;
};

const getDateRange = (range) => {
  const today = new Date();
  switch (range) {
    case 'today':
      return { start: getStartOfDay(today), end: getEndOfDay(today) };
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: getStartOfDay(yesterday), end: getEndOfDay(yesterday) };
    case 'this_week':
      return { start: getStartOfWeek(today), end: getEndOfWeek(today) };
    case 'last_week':
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      return { start: getStartOfWeek(lastWeek), end: getEndOfWeek(lastWeek) };
    case 'this_month':
      return { start: getStartOfMonth(today), end: getEndOfMonth(today) };
    case 'last_month':
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return { start: getStartOfMonth(lastMonth), end: getEndOfMonth(lastMonth) };
    case 'this_year':
      return { start: getStartOfYear(today), end: getEndOfYear(today) };
    case 'last_year':
      const lastYear = new Date(today);
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      return { start: getStartOfYear(lastYear), end: getEndOfYear(lastYear) };
    default:
      return { start: getStartOfDay(today), end: getEndOfDay(today) };
  }
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const addYears = (date, years) => {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
};

const differenceInDays = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const differenceInMonths = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (d2.getFullYear() - d1.getFullYear()) * 12 + 
         (d2.getMonth() - d1.getMonth());
};

const isToday = (date) => {
  const today = new Date();
  const d = new Date(date);
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
};

const isThisWeek = (date) => {
  const today = new Date();
  const d = new Date(date);
  const weekStart = getStartOfWeek(today);
  const weekEnd = getEndOfWeek(today);
  return d >= weekStart && d <= weekEnd;
};

const isThisMonth = (date) => {
  const today = new Date();
  const d = new Date(date);
  return d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
};

const getRelativeTime = (date) => {
  const now = new Date();
  const d = new Date(date);
  const diffInSeconds = Math.floor((now - d) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
};

module.exports = {
  formatDate,
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  getStartOfYear,
  getEndOfYear,
  getDateRange,
  addDays,
  addMonths,
  addYears,
  differenceInDays,
  differenceInMonths,
  isToday,
  isThisWeek,
  isThisMonth,
  getRelativeTime
};