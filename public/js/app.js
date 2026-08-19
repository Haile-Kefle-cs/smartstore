// Main Application JavaScript
const API_URL = '/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

document.addEventListener('DOMContentLoaded', init);

function init() {
    // Check authentication
    if (!authToken || !currentUser) {
        window.location.href = '/pages/login.html';
        return;
    }
    
    // Set user info
    document.getElementById('user-name').textContent = currentUser.name || 'User';
    
    // Setup navigation
    setupNavigation();
    
    // Load dashboard
    loadDashboard();
}

function setupNavigation() {
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        }
    });
    
    const titles = {
        'dashboard': 'Dashboard',
        'pos': 'Point of Sale',
        'products': 'Products',
        'categories': 'Categories',
        'inventory': 'Inventory',
        'sales': 'Sales',
        'customers': 'Customers',
        'suppliers': 'Suppliers',
        'reports': 'Reports',
        'settings': 'Settings'
    };
    
    document.getElementById('page-title').textContent = titles[page] || page;
    
    if (page === 'dashboard') loadDashboard();
    else if (page === 'products') loadProducts();
    else if (page === 'sales') loadSales();
    else if (page === 'customers') loadCustomers();
    else if (page === 'reports') loadReports();
    else if (page === 'settings') loadSettings();
    else {
        document.getElementById('content-area').innerHTML = `<h2>${titles[page] || page}</h2><p>Coming soon...</p>`;
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = '/pages/login.html';
}

async function apiRequest(endpoint, method = 'GET', data = null) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };
    
    const config = { method, headers };
    if (data) config.body = JSON.stringify(data);
    
    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    if (response.status === 401) {
        logout();
        throw new Error('Authentication failed');
    }
    
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Request failed');
    
    return result;
}

async function loadDashboard() {
    const content = document.getElementById('content-area');
    content.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    
    try {
        const [products, sales, customers] = await Promise.all([
            apiRequest('/products'),
            apiRequest('/sales'),
            apiRequest('/customers')
        ]);
        
        const todaySales = sales.data.filter(s => {
            return new Date(s.createdAt).toDateString() === new Date().toDateString();
        });
        
        const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
        
        content.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Today's Sales</h3>
                    <p class="stat-value">$${todayRevenue.toFixed(2)}</p>
                    <span>${todaySales.length} transactions</span>
                </div>
                <div class="stat-card">
                    <h3>Total Products</h3>
                    <p class="stat-value">${products.data.length}</p>
                    <span>items in inventory</span>
                </div>
                <div class="stat-card">
                    <h3>Total Sales</h3>
                    <p class="stat-value">${sales.data.length}</p>
                    <span>all time</span>
                </div>
                <div class="stat-card">
                    <h3>Customers</h3>
                    <p class="stat-value">${customers.data.length}</p>
                    <span>registered</span>
                </div>
            </div>
            
            <div class="card">
                <h3>Quick Actions</h3>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="btn btn-primary" onclick="navigateTo('pos')">New Sale</button>
                    <button class="btn btn-primary" onclick="navigateTo('products')">Add Product</button>
                    <button class="btn btn-primary" onclick="navigateTo('reports')">View Reports</button>
                </div>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
    }
}

async function loadProducts() {
    const content = document.getElementById('content-area');
    content.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    
    try {
        const result = await apiRequest('/products');
        
        content.innerHTML = `
            <div class="page-header">
                <h2>Products</h2>
                <button class="btn btn-primary" onclick="alert('Add product feature coming soon')">+ Add Product</button>
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>SKU</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${result.data.map(p => `
                            <tr>
                                <td>${p.name}</td>
                                <td>${p.sku}</td>
                                <td>${p.categoryName}</td>
                                <td>$${p.price.toFixed(2)}</td>
                                <td>${p.quantity}</td>
                                <td><span class="status-badge ${p.stockStatus}">${p.stockStatus}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
    }
}

async function loadSales() {
    const content = document.getElementById('content-area');
    
    try {
        const result = await apiRequest('/sales');
        
        content.innerHTML = `
            <div class="page-header">
                <h2>Sales</h2>
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Order #</th>
                            <th>Date</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Payment</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${result.data.map(s => `
                            <tr>
                                <td>${s.orderNumber}</td>
                                <td>${new Date(s.createdAt).toLocaleString()}</td>
                                <td>${s.items.length}</td>
                                <td>$${s.total.toFixed(2)}</td>
                                <td>${s.paymentMethod}</td>
                                <td><span class="status-badge ${s.status}">${s.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
    }
}

async function loadCustomers() {
    const content = document.getElementById('content-area');
    
    try {
        const result = await apiRequest('/customers');
        
        content.innerHTML = `
            <div class="page-header">
                <h2>Customers</h2>
                <button class="btn btn-primary" onclick="alert('Add customer feature coming soon')">+ Add Customer</button>
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Total Spent</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${result.data.map(c => `
                            <tr>
                                <td>${c.name}</td>
                                <td>${c.email || 'N/A'}</td>
                                <td>${c.phone || 'N/A'}</td>
                                <td>$${(c.totalSpent || 0).toFixed(2)}</td>
                                <td><span class="status-badge ${c.active ? 'active' : 'inactive'}">${c.active ? 'Active' : 'Inactive'}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
    }
}

async function loadReports() {
    const content = document.getElementById('content-area');
    
    try {
        const result = await apiRequest('/reports/sales');
        const report = result.data;
        
        content.innerHTML = `
            <div class="page-header">
                <h2>Reports</h2>
            </div>
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Total Sales</h3>
                    <p class="stat-value">${report.totalSales}</p>
                </div>
                <div class="stat-card">
                    <h3>Total Revenue</h3>
                    <p class="stat-value">$${report.totalRevenue.toFixed(2)}</p>
                </div>
                <div class="stat-card">
                    <h3>Average Sale</h3>
                    <p class="stat-value">$${report.averageSale.toFixed(2)}</p>
                </div>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
    }
}

async function loadSettings() {
    const content = document.getElementById('content-area');
    
    try {
        const settings = await apiRequest('/settings');
        
        content.innerHTML = `
            <div class="page-header">
                <h2>Settings</h2>
            </div>
            <div class="card">
                <h3>Store Information</h3>
                <p><strong>Store Name:</strong> ${settings.storeName || 'SmartStore'}</p>
                <p><strong>Tax Rate:</strong> ${settings.taxRate || 10}%</p>
                <p><strong>Currency:</strong> ${settings.currency || 'USD'}</p>
                <p><strong>Low Stock Threshold:</strong> ${settings.lowStockThreshold || 10}</p>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
    }
}