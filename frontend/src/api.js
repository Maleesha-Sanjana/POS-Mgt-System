const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5032';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.message || `API request failed with status ${response.status}`;
    throw new Error(message);
  }
  return data;
}

export const posApi = {
  checkDbHealth: () => request('/api/health/db'),
  bootstrap: () => request('/api/bootstrap'),

  // Auth & Users
  login: (username, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  getUsers: () => request('/api/users'),
  createUser: (payload) =>
    request('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  toggleUserStatus: (id) =>
    request(`/api/users/${id}/toggle-status`, {
      method: 'PATCH',
    }),

  // Products & Categories
  getProducts: () => request('/api/products'),
  createProduct: (payload) =>
    request('/api/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateProduct: (id, payload) =>
    request(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteProduct: (id) =>
    request(`/api/products/${id}`, {
      method: 'DELETE',
    }),
  getCategories: () => request('/api/categories'),
  createCategory: (payload) =>
    request('/api/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Goods Received from Production (GRN) & Stock Adjustment Notes (Admin Exclusive)
  getStockAdjustments: () => request('/api/stock-adjustments'),
  createStockAdjustment: (payload) =>
    request('/api/stock-adjustments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Customers & Loyalty
  getCustomers: () => request('/api/customers'),
  createCustomer: (payload) =>
    request('/api/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCustomer: (code, payload) =>
    request(`/api/customers/${encodeURIComponent(code)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteCustomer: (code) =>
    request(`/api/customers/${encodeURIComponent(code)}`, {
      method: 'DELETE',
    }),

  // Orders & Refunds
  getOrders: () => request('/api/orders'),
  createOrder: (payload) =>
    request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  refundOrder: (orderNumber, payload) =>
    request(`/api/orders/${encodeURIComponent(orderNumber)}/refund`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Discounts, Settings, Reports & Audit Logs
  getDiscounts: () => request('/api/discounts'),
  getSettings: () => request('/api/settings'),
  updateSettings: (payload) =>
    request('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getReportsSummary: () => request('/api/reports/summary'),
  getAuditLogs: () => request('/api/audit-logs'),
};

