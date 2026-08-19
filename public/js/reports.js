// Reports JavaScript
let currentReport = 'sales';
let reportRange = 'this_month';

async function loadReports() {
    showLoading();
    
    try {
        const reportContent = document.createElement('div');
        reportContent.id = 'report-content';
        contentArea.innerHTML = '';
        contentArea.appendChild(reportContent);
        
        await switchReport(currentReport);
    } catch (error) {
        showError(error.message);
    }
}

async function switchReport(reportType) {
    currentReport = reportType;
    
    // Update active tab
    document.querySelectorAll('.report-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    const reportContent = document.getElementById('report-content');
    reportContent.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    
    try {
        switch (reportType) {
            case 'sales':
                await loadSalesReport(reportContent);
                break;
            case 'purchases':
                await loadPurchasesReport(reportContent);
                break;
            case 'expenses':
                await loadExpensesReport(reportContent);
                break;
            case 'inventory':
                await loadInventoryReport(reportContent);
                break;
            case 'profit-loss':
                await loadProfitLossReport(reportContent);
                break;
        }
    } catch (error) {
        reportContent.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
    }
}

async function loadSalesReport(container) {
    const result = await SmartStore.apiRequest(`/reports/sales?range=${reportRange}`);
    const report = result.data;
    
    container.innerHTML = `
        <div class="report-content">
            <h3>Sales Report</h3>
            <div class="report-stats">
                <div class="report-stat">
                    <div class="report-stat-label">Total Sales</div>
                    <div class="report-stat-value">${report.totalSales}</div>
                </div>
                <div class="report-stat">
                    <div class="report-stat-label">Total Revenue</div>
                    <div class="report-stat-value">${SmartStore.formatCurrency(report.totalRevenue)}</div>
                </div>
                <div class="report-stat">
                    <div class="report-stat-label">Average Sale</div>
                    <div class="report-stat-value">${SmartStore.formatCurrency(report.averageSale)}</div>
                </div>
            </div>
            
            <h4>Recent Sales</h4>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Order #</th>
                            <th>Date</th>
                            <th>Total</th>
                            <th>Payment</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.sales.slice(0, 20).map(sale => `
                            <tr>
                                <td>${sale.orderNumber}</td>
                                <td>${SmartStore.formatDateTime(sale.createdAt)}</td>
                                <td>${SmartStore.formatCurrency(sale.total)}</td>
                                <td>${sale.paymentMethod}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function loadProfitLossReport(container) {
    const result = await SmartStore.apiRequest(`/reports/profit-loss?range=${reportRange}`);
    const report = result.data;
    
    container.innerHTML = `
        <div class="report-content">
            <h3>Profit & Loss Report</h3>
            <div class="report-stats">
                <div class="report-stat">
                    <div class="report-stat-label">Revenue</div>
                    <div class="report-stat-value">${SmartStore.formatCurrency(report.revenue)}</div>
                </div>
                <div class="report-stat">
                    <div class="report-stat-label">Purchases</div>
                    <div class="report-stat-value">${SmartStore.formatCurrency(report.purchases)}</div>
                </div>
                <div class="report-stat">
                    <div class="report-stat-label">Expenses</div>
                    <div class="report-stat-value">${SmartStore.formatCurrency(report.expenses)}</div>
                </div>
                <div class="report-stat">
                    <div class="report-stat-label">Gross Profit</div>
                    <div class="report-stat-value">${SmartStore.formatCurrency(report.grossProfit)}</div>
                </div>
                <div class="report-stat">
                    <div class="report-stat-label">Net Profit</div>
                    <div class="report-stat-value">${SmartStore.formatCurrency(report.netProfit)}</div>
                </div>
                <div class="report-stat">
                    <div class="report-stat-label">Profit Margin</div>
                    <div class="report-stat-value">${report.profitMargin.toFixed(2)}%</div>
                </div>
            </div>
        </div>
    `;
}

async function loadInventoryReport(container) {
    const result = await SmartStore.apiRequest('/reports/inventory');
    const report = result.data;
    
    container.innerHTML = `
        <div class="report-content">
            <h3>Inventory Report</h3>
            <div class="report-stats">
                <div class="report-stat">
                    <div class="report-stat-label">Total Products</div>
                    <div class="report-stat-value">${report.totalProducts}</div>
                </div>
                <div class="report-stat">
                    <div class="report-stat-label">Stock Value</div>
                    <div class="report-stat-value">${SmartStore.formatCurrency(report.totalStockValue)}</div>
                </div>
                <div class="report-stat">
                    <div class="report-stat-label">Low Stock</div>
                    <div class="report-stat-value">${report.lowStockCount}</div>
                </div>
                <div class="report-stat">
                    <div class="report-stat-label">Out of Stock</div>
                    <div class="report-stat-value">${report.outOfStockCount}</div>
                </div>
            </div>
            
            <h4>Low Stock Products</h4>
            ${report.lowStockProducts.length > 0 ? `
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>Quantity</th>
                                <th>Reorder Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${report.lowStockProducts.map(product => `
                                <tr>
                                    <td>${product.name}</td>
                                    <td>${product.sku}</td>
                                    <td>${product.quantity}</td>
                                    <td>${product.reorderLevel}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<p>No low stock products</p>'}
        </div>
    `;
}

// Additional report loaders (purchases, expenses) follow similar patterns

function printReport() {
    window.print();
}