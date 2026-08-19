// Dashboard JavaScript
async function loadDashboard() {
    showLoading();
    
    try {
        // Fetch dashboard data
        const [products, sales, customers, notifications] = await Promise.all([
            SmartStore.apiRequest('/products?limit=100'),
            SmartStore.apiRequest('/sales?limit=100'),
            SmartStore.apiRequest('/customers'),
            SmartStore.apiRequest('/notifications/unread-count')
        ]);
        
        // Calculate statistics
        const todaySales = sales.data.filter(sale => {
            const saleDate = new Date(sale.createdAt);
            const today = new Date();
            return saleDate.toDateString() === today.toDateString();
        });
        
        const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
        const lowStockItems = products.data.filter(p => 
            p.quantity <= p.reorderLevel && p.quantity > 0
        );
        
        // Render dashboard
        contentArea.innerHTML = `
            <div class="dashboard-container">
                <!-- Stats Cards -->
                <div class="stats-grid">
                    <div class="stat-card primary">
                        <div class="stat-icon">💰</div>
                        <div class="stat-info">
                            <h3>Today's Sales</h3>
                            <p class="stat-value">${SmartStore.formatCurrency(todayRevenue)}</p>
                            <span class="stat-label">${todaySales.length} transactions</span>
                        </div>
                    </div>
                    
                    <div class="stat-card success">
                        <div class="stat-icon">📦</div>
                        <div class="stat-info">
                            <h3>Total Products</h3>
                            <p class="stat-value">${products.pagination.total}</p>
                            <span class="stat-label">items in inventory</span>
                        </div>
                    </div>
                    
                    <div class="stat-card warning">
                        <div class="stat-icon">⚠️</div>
                        <div class="stat-info">
                            <h3>Low Stock Items</h3>
                            <p class="stat-value">${lowStockItems.length}</p>
                            <span class="stat-label">need attention</span>
                        </div>
                    </div>
                    
                    <div class="stat-card danger">
                        <div class="stat-icon">👥</div>
                        <div class="stat-info">
                            <h3>Total Customers</h3>
                            <p class="stat-value">${customers.data.length}</p>
                            <span class="stat-label">registered</span>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="quick-actions">
                    <button class="quick-action-btn" onclick="SmartStore.navigateTo('pos')">
                        <div class="quick-action-icon">🛒</div>
                        <div class="quick-action-label">New Sale</div>
                    </button>
                    <button class="quick-action-btn" onclick="SmartStore.navigateTo('products')">
                        <div class="quick-action-icon">📦</div>
                        <div class="quick-action-label">Add Product</div>
                    </button>
                    <button class="quick-action-btn" onclick="SmartStore.navigateTo('purchases')">
                        <div class="quick-action-icon">📥</div>
                        <div class="quick-action-label">New Purchase</div>
                    </button>
                    <button class="quick-action-btn" onclick="SmartStore.navigateTo('reports')">
                        <div class="quick-action-icon">📈</div>
                        <div class="quick-action-label">View Reports</div>
                    </button>
                </div>

                <!-- Recent Sales -->
                <div class="activity-card">
                    <h3>Recent Sales</h3>
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Order #</th>
                                    <th>Customer</th>
                                    <th>Amount</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sales.data.slice(0, 10).map(sale => `
                                    <tr>
                                        <td>${sale.orderNumber}</td>
                                        <td>${sale.customerName || 'Walk-in'}</td>
                                        <td>${SmartStore.formatCurrency(sale.total)}</td>
                                        <td>${SmartStore.formatDateTime(sale.createdAt)}</td>
                                        <td><span class="status-badge ${sale.status}">${sale.status}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Low Stock Alerts -->
                ${lowStockItems.length > 0 ? `
                    <div class="activity-card">
                        <h3>Low Stock Alerts</h3>
                        <div class="alert-list">
                            ${lowStockItems.map(item => `
                                <div class="alert-item">
                                    <div class="alert-icon">⚠️</div>
                                    <div class="alert-content">
                                        <div class="alert-title">${item.name}</div>
                                        <div class="alert-message">${item.quantity} remaining (reorder at ${item.reorderLevel})</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        showError(error.message);
    }
}