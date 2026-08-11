export const formatCurrency = (value, currency = 'INR') => {
  const num = parseFloat(value) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);
};

export const formatDate = (dateStr, options = {}) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...options,
    });
  } catch {
    return '-';
  }
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '-';
  }
};

export const truncate = (str, maxLen = 50) => {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
};

export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
};

export const getStatusColor = (status) => {
  const map = {
    new: 'info', quotation: 'primary', followup: 'warning', confirmed: 'success', lost: 'danger',
    draft: 'warning', sent: 'primary', accepted: 'success', rejected: 'danger',
    pending: 'warning', cancelled: 'danger', completed: 'info',
    active: 'success', inactive: 'danger',
    paid: 'success', done: 'success', missed: 'danger',
    advance: 'info', installment: 'primary', final: 'success', refund: 'danger',
  };
  return map[status] || 'gray';
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
};

export const calculateProfitMargin = (revenue, expenses) => {
  const rev = parseFloat(revenue) || 0;
  const exp = parseFloat(expenses) || 0;
  if (rev === 0) return 0;
  return ((rev - exp) / rev * 100);
};
