// Purchases Management JavaScript
let editingPurchaseId = null;
let purchaseItems = [];

async function loadPurchases() {
    showLoading();
    
    try {
        const result = await SmartStore.apiRequest('/purchases');
        renderPurchases(result.data);
    } catch (error) {
        showError(error.message);
    }
}

function renderPurchases(purchases) {
    contentArea.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h2>Purchase Orders</h2>
                <button class="btn btn-primary" onclick="showAddPurchaseModal()">
                    + New Purchase
                </button>
            </div>

            <div class="filter-bar">
                <div class="search-box">
                    <input type="text" id="purchase-search" class="form-control" 
                           placeholder="Search purchases..." 
                           onkeyup="searchPurchases(this.value)">
                    <span class="search-icon">🔍</span>
                </div>
                <select id="purchase-status-filter" class="form-control" onchange="filterPurchasesByStatus(this.value)">
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>PO Number</th>
                            <th>Date</th>
                            <th>Supplier</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${purchases.map(purchase => `
                            <tr>
                                <td>${purchase.orderNumber}</td>
                                <td>${SmartStore.formatDateTime(purchase.createdAt)}</td>
                                <td>${purchase.supplierName || 'Unknown'}</td>
                                <td>${purchase.items.length}</td>
                                <td>${SmartStore.formatCurrency(purchase.total)}</td>
                                <td><span class="status-badge ${purchase.status}">${purchase.status}</span></td>
                                <td>
                                    <div class="table-actions">
                                        <button class="action-btn action-btn-view" onclick="viewPurchase('${purchase.id}')">👁️</button>
                                        ${purchase.status === 'pending' ? `
                                            <button class="action-btn action-btn-edit" onclick="receivePurchase('${purchase.id}')">📥</button>
                                        ` : ''}
                                        <button class="action-btn action-btn-print" onclick="printPurchaseOrder('${purchase.id}')">🖨️</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function searchPurchases(query) {
    const rows = document.querySelectorAll('#purchases-table tbody tr, .table tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
}

function filterPurchasesByStatus(status) {
    const rows = document.querySelectorAll('.table tbody tr');
    rows.forEach(row => {
        const statusCell = row.querySelector('.status-badge');
        if (!status || (statusCell && statusCell.textContent === status)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

async function showAddPurchaseModal() {
    purchaseItems = [];
    
    try {
        const [suppliers, products] = await Promise.all([
            SmartStore.apiRequest('/suppliers'),
            SmartStore.apiRequest('/products?limit=100')
        ]);
        
        const modalHTML = `
            <div class="modal" id="purchase-modal">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3>New Purchase Order</h3>
                        <button class="modal-close" onclick="closePurchaseModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="purchase-form">
                            <div class="form-group">
                                <label for="purchase-supplier">Supplier *</label>
                                <select id="purchase-supplier" class="form-control" required>
                                    <option value="">Select Supplier</option>
                                    ${suppliers.data.map(supplier => `
                                        <option value="${supplier.id}">${supplier.companyName}</option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div class="form-section">
                                <h4>Add Items</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Product</label>
                                        <select id="purchase-product" class="form-control">
                                            <option value="">Select Product</option>
                                            ${products.data.map(product => `
                                                <option value="${product.id}" 
                                                        data-name="${product.name}"
                                                        data-cost="${product.costPrice}">
                                                    ${product.name} (Cost: ${SmartStore.formatCurrency(product.costPrice)})
                                                </option>
                                            `).join('')}
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Quantity</label>
                                        <input type="number" id="purchase-quantity" class="form-control" min="1" value="1">
                                    </div>
                                    <div class="form-group">
                                        <label>&nbsp;</label>
                                        <button type="button" class="btn btn-primary" onclick="addPurchaseItem()">Add Item</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="purchase-items-list" id="purchase-items-list">
                                ${purchaseItems.length === 0 ? '<p class="text-muted">No items added</p>' : ''}
                            </div>
                            
                            <div class="form-group">
                                <label for="purchase-notes">Notes</label>
                                <textarea id="purchase-notes" class="form-control" rows="3"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closePurchaseModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="savePurchase()">Create Purchase Order</button>
                    </div>
                </div>
            </div>
        `;
        
        showModalContent(modalHTML);
        
        // Add event listener for product selection
        document.getElementById('purchase-product')?.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption.value) {
                const cost = selectedOption.dataset.cost;
                // Auto-fill quantity based on reorder level if available
                const product = products.data.find(p => p.id === selectedOption.value);
                if (product && product.quantity <= product.reorderLevel) {
                    const suggestedQty = (product.reorderLevel * 2) - product.quantity;
                    document.getElementById('purchase-quantity').value = Math.max(1, suggestedQty);
                }
            }
        });
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

function addPurchaseItem() {
    const productSelect = document.getElementById('purchase-product');
    const quantityInput = document.getElementById('purchase-quantity');
    
    const productId = productSelect.value;
    const quantity = parseInt(quantityInput.value);
    
    if (!productId || !quantity || quantity < 1) {
        SmartStore.showToast('Please select a product and enter valid quantity', 'error');
        return;
    }
    
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const productName = selectedOption.dataset.name;
    const costPrice = parseFloat(selectedOption.dataset.cost);
    
    // Check if product already exists in list
    const existingItem = purchaseItems.find(item => item.productId === productId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        purchaseItems.push({
            productId,
            productName,
            quantity,
            costPrice
        });
    }
    
    // Reset form
    productSelect.value = '';
    quantityInput.value = '1';
    
    renderPurchaseItems();
}

function renderPurchaseItems() {
    const container = document.getElementById('purchase-items-list');
    
    if (purchaseItems.length === 0) {
        container.innerHTML = '<p class="text-muted">No items added</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Cost Price</th>
                    <th>Total</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${purchaseItems.map((item, index) => `
                    <tr>
                        <td>${item.productName}</td>
                        <td>${item.quantity}</td>
                        <td>${SmartStore.formatCurrency(item.costPrice)}</td>
                        <td>${SmartStore.formatCurrency(item.quantity * item.costPrice)}</td>
                        <td>
                            <button class="action-btn action-btn-delete" onclick="removePurchaseItem(${index})">×</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function removePurchaseItem(index) {
    purchaseItems.splice(index, 1);
    renderPurchaseItems();
}

function closePurchaseModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.style.display = 'none';
    modalContainer.innerHTML = '';
}

async function savePurchase() {
    const supplierId = document.getElementById('purchase-supplier').value;
    const notes = document.getElementById('purchase-notes').value;
    
    if (!supplierId) {
        SmartStore.showToast('Please select a supplier', 'error');
        return;
    }
    
    if (purchaseItems.length === 0) {
        SmartStore.showToast('Please add at least one item', 'error');
        return;
    }
    
    const purchaseData = {
        supplierId,
        items: purchaseItems,
        notes
    };
    
    try {
        await SmartStore.apiRequest('/purchases', 'POST', purchaseData);
        SmartStore.showToast('Purchase order created successfully');
        closePurchaseModal();
        loadPurchases();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function receivePurchase(purchaseId) {
    if (!confirm('Mark this purchase as received? Stock will be updated.')) {
        return;
    }
    
    try {
        await SmartStore.apiRequest(`/purchases/${purchaseId}/receive`, 'POST');
        SmartStore.showToast('Purchase received successfully');
        loadPurchases();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function viewPurchase(purchaseId) {
    try {
        const result = await SmartStore.apiRequest(`/purchases/${purchaseId}`);
        const purchase = result.data;
        
        const modalHTML = `
            <div class="modal" id="purchase-view-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Purchase Details</h3>
                        <button class="modal-close" onclick="closePurchaseModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <h4>${purchase.orderNumber}</h4>
                        <p><strong>Date:</strong> ${SmartStore.formatDateTime(purchase.createdAt)}</p>
                        <p><strong>Status:</strong> ${purchase.status}</p>
                        <hr>
                        <h5>Items</h5>
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Cost</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${purchase.items.map(item => `
                                    <tr>
                                        <td>${item.productName}</td>
                                        <td>${item.quantity}</td>
                                        <td>${SmartStore.formatCurrency(item.costPrice)}</td>
                                        <td>${SmartStore.formatCurrency(item.total)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <hr>
                        <p><strong>Total:</strong> ${SmartStore.formatCurrency(purchase.total)}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closePurchaseModal()">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        showModalContent(modalHTML);
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function printPurchaseOrder(purchaseId) {
    try {
        const result = await SmartStore.apiRequest(`/purchases/${purchaseId}/invoice`);
        const po = result.data;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Purchase Order ${po.poNumber}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .supplier-info { margin-bottom: 30px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
                        th { background-color: #f5f5f5; }
                        .total { font-weight: bold; font-size: 1.2em; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Purchase Order</h1>
                        <p>${po.poNumber}</p>
                        <p>Date: ${new Date(po.date).toLocaleDateString()}</p>
                    </div>
                    <div class="supplier-info">
                        <h3>Supplier:</h3>
                        <p>${po.supplier?.companyName || 'N/A'}</p>
                        <p>${po.supplier?.contactPerson || ''}</p>
                        <p>${po.supplier?.email || ''}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Quantity</th>
                                <th>Cost</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${po.items.map(item => `
                                <tr>
                                    <td>${item.productName}</td>
                                    <td>${item.quantity}</td>
                                    <td>$${item.costPrice.toFixed(2)}</td>
                                    <td>$${item.total.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <p class="total">Total: $${po.total.toFixed(2)}</p>
                    <script>
                        window.onload = function() { window.print(); }
                    <\/script>
                </body>
            </html>
        `);
        printWindow.document.close();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}