// Sales JavaScript
let salesPage = 1;
let salesFilter = {};

async function loadSales() {
    showLoading();
    
    try {
        const queryString = new URLSearchParams({
            page: salesPage,
            limit: 20,
            ...salesFilter
        }).toString();
        
        const result = await SmartStore.apiRequest(`/sales?${queryString}`);
        renderSales(result);
    } catch (error) {
        showError(error.message);
    }
}

function renderSales(result) {
    const sales = result.data;
    
    contentArea.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h2>Sales History</h2>
            </div>

            <div class="filter-bar">
                <div class="search-box">
                    <input type="text" id="sale-search" class="form-control" 
                           placeholder="Search by order number..." 
                           onkeyup="searchSales(this.value)">
                    <span class="search-icon">🔍</span>
                </div>
                <input type="date" id="sale-date-from" class="form-control">
                <input type="date" id="sale-date-to" class="form-control">
                <button class="btn btn-primary" onclick="filterSalesByDate()">Filter</button>
            </div>

            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Order #</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Payment</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sales.map(sale => `
                            <tr>
                                <td>${sale.orderNumber}</td>
                                <td>${SmartStore.formatDateTime(sale.createdAt)}</td>
                                <td>${sale.customerName || 'Walk-in'}</td>
                                <td>${sale.items.length}</td>
                                <td>${SmartStore.formatCurrency(sale.total)}</td>
                                <td>${sale.paymentMethod}</td>
                                <td><span class="status-badge ${sale.status}">${sale.status}</span></td>
                                <td>
                                    <div class="table-actions">
                                        <button class="action-btn action-btn-view" onclick="viewSale('${sale.id}')">👁️</button>
                                        <button class="action-btn action-btn-print" onclick="printReceipt('${sale.id}')">🖨️</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="pagination">
                <button class="pagination-btn" onclick="changeSalesPage(${salesPage - 1})" 
                        ${salesPage <= 1 ? 'disabled' : ''}>←</button>
                <span class="pagination-info">Page ${result.pagination.page} of ${result.pagination.pages}</span>
                <button class="pagination-btn" onclick="changeSalesPage(${salesPage + 1})" 
                        ${salesPage >= result.pagination.pages ? 'disabled' : ''}>→</button>
            </div>
        </div>
    `;
}

function searchSales(query) {
    clearTimeout(window.salesSearchTimeout);
    window.salesSearchTimeout = setTimeout(() => {
        salesFilter.search = query;
        salesPage = 1;
        loadSales();
    }, 500);
}

function filterSalesByDate() {
    const from = document.getElementById('sale-date-from').value;
    const to = document.getElementById('sale-date-to').value;
    
    if (from) salesFilter.start = from;
    if (to) salesFilter.end = to;
    
    salesPage = 1;
    loadSales();
}

function changeSalesPage(page) {
    salesPage = page;
    loadSales();
}

async function viewSale(saleId) {
    try {
        const result = await SmartStore.apiRequest(`/sales/${saleId}`);
        const sale = result.data;
        
        const modalHTML = `
            <div class="modal" id="sale-view-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Sale Details</h3>
                        <button class="modal-close" onclick="closeModal('sale-view-modal')">×</button>
                    </div>
                    <div class="modal-body">
                        <h4>${sale.orderNumber}</h4>
                        <p><strong>Date:</strong> ${SmartStore.formatDateTime(sale.createdAt)}</p>
                        <p><strong>Customer:</strong> ${sale.customerName || 'Walk-in'}</p>
                        <p><strong>Payment:</strong> ${sale.paymentMethod}</p>
                        <hr>
                        <h5>Items</h5>
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Price</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sale.items.map(item => `
                                    <tr>
                                        <td>${item.productName}</td>
                                        <td>${item.quantity}</td>
                                        <td>${SmartStore.formatCurrency(item.price)}</td>
                                        <td>${SmartStore.formatCurrency(item.total)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <hr>
                        <p><strong>Subtotal:</strong> ${SmartStore.formatCurrency(sale.subtotal)}</p>
                        <p><strong>Tax:</strong> ${SmartStore.formatCurrency(sale.tax)}</p>
                        <p><strong>Discount:</strong> ${SmartStore.formatCurrency(sale.discount)}</p>
                        <p><strong>Total:</strong> ${SmartStore.formatCurrency(sale.total)}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeModal('sale-view-modal')">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        const modalContainer = document.getElementById('modal-container');
        modalContainer.innerHTML = modalHTML;
        modalContainer.style.display = 'flex';
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function printReceipt(saleId) {
    try {
        const result = await SmartStore.apiRequest(`/sales/${saleId}/receipt`);
        const receipt = result.data;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Receipt ${receipt.invoiceNumber}</title>
                    <style>
                        body { font-family: monospace; padding: 20px; }
                        .receipt { max-width: 300px; margin: 0 auto; }
                        h2 { text-align: center; }
                        .item { display: flex; justify-content: space-between; }
                        .total { font-weight: bold; font-size: 1.2em; }
                        hr { border: 1px dashed #ccc; }
                    </style>
                </head>
                <body>
                    <div class="receipt">
                        <h2>${receipt.storeInfo.name}</h2>
                        <p>${receipt.storeInfo.address}</p>
                        <p>${receipt.storeInfo.phone}</p>
                        <hr>
                        <p>Order: ${receipt.invoiceNumber}</p>
                        <p>Date: ${new Date(receipt.date).toLocaleString()}</p>
                        <hr>
                        ${receipt.items.map(item => `
                            <div class="item">
                                <span>${item.productName} x${item.quantity}</span>
                                <span>$${item.total.toFixed(2)}</span>
                            </div>
                        `).join('')}
                        <hr>
                        <p>Subtotal: $${receipt.subtotal.toFixed(2)}</p>
                        <p>Tax: $${receipt.tax.toFixed(2)}</p>
                        <p>Discount: $${receipt.discount.toFixed(2)}</p>
                        <p class="total">Total: $${receipt.total.toFixed(2)}</p>
                        <p>Payment: ${receipt.paymentMethod}</p>
                        <hr>
                        <p style="text-align: center;">${receipt.footer}</p>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                        }
                    <\/script>
                </body>
            </html>
        `);
        printWindow.document.close();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}