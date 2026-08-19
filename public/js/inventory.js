// Inventory Management JavaScript
async function loadInventory() {
    showLoading();
    
    try {
        const [summary, movements] = await Promise.all([
            SmartStore.apiRequest('/inventory'),
            SmartStore.apiRequest('/inventory/movements/recent')
        ]);
        
        renderInventory(summary.data, movements.data);
    } catch (error) {
        showError(error.message);
    }
}

function renderInventory(summary, movements) {
    contentArea.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h2>Inventory Management</h2>
                <button class="btn btn-primary" onclick="showStockAdjustModal()">
                    Adjust Stock
                </button>
            </div>

            <div class="inventory-summary">
                <div class="summary-card">
                    <h3>Total Products</h3>
                    <p>${summary.totalProducts}</p>
                </div>
                <div class="summary-card">
                    <h3>Total Quantity</h3>
                    <p>${summary.totalQuantity}</p>
                </div>
                <div class="summary-card">
                    <h3>Stock Value</h3>
                    <p>${SmartStore.formatCurrency(summary.totalValue)}</p>
                </div>
                <div class="summary-card">
                    <h3>Low Stock</h3>
                    <p>${summary.lowStock}</p>
                </div>
                <div class="summary-card">
                    <h3>Out of Stock</h3>
                    <p>${summary.outOfStock}</p>
                </div>
            </div>

            <h3>Recent Stock Movements</h3>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Product</th>
                            <th>Type</th>
                            <th>Quantity</th>
                            <th>Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${movements.map(movement => `
                            <tr>
                                <td>${SmartStore.formatDateTime(movement.date)}</td>
                                <td>${movement.productId}</td>
                                <td>${movement.type}</td>
                                <td>${movement.quantity > 0 ? '+' : ''}${movement.quantity}</td>
                                <td>${movement.balance}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function showStockAdjustModal() {
    const modalHTML = `
        <div class="modal" id="stock-adjust-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Adjust Stock</h3>
                    <button class="modal-close" onclick="closeStockAdjustModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="stock-adjust-form">
                        <div class="form-group">
                            <label for="adjust-product">Product</label>
                            <select id="adjust-product" class="form-control" required>
                                <option value="">Select Product</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="adjust-quantity">New Quantity</label>
                            <input type="number" id="adjust-quantity" class="form-control" min="0" required>
                        </div>
                        <div class="form-group">
                            <label for="adjust-reason">Reason</label>
                            <textarea id="adjust-reason" class="form-control" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeStockAdjustModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="submitStockAdjust()">Adjust Stock</button>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = modalHTML;
    modalContainer.style.display = 'flex';
    
    // Load products
    loadProductsForAdjust();
}

function loadProductsForAdjust() {
    SmartStore.apiRequest('/products?limit=100')
        .then(result => {
            const select = document.getElementById('adjust-product');
            result.data.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} (Current: ${product.quantity})`;
                select.appendChild(option);
            });
        })
        .catch(error => SmartStore.showToast(error.message, 'error'));
}

function closeStockAdjustModal() {
    document.getElementById('modal-container').style.display = 'none';
    document.getElementById('modal-container').innerHTML = '';
}

async function submitStockAdjust() {
    const productId = document.getElementById('adjust-product').value;
    const newQuantity = parseInt(document.getElementById('adjust-quantity').value);
    const reason = document.getElementById('adjust-reason').value;
    
    if (!productId || isNaN(newQuantity)) {
        SmartStore.showToast('Please fill all required fields', 'error');
        return;
    }
    
    try {
        await SmartStore.apiRequest('/inventory/adjust', 'POST', {
            productId,
            newQuantity,
            reason
        });
        
        SmartStore.showToast('Stock adjusted successfully');
        closeStockAdjustModal();
        loadInventory();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}