// Returns Management JavaScript
async function loadReturns() {
    showLoading();
    
    try {
        const result = await SmartStore.apiRequest('/returns');
        renderReturns(result.data);
    } catch (error) {
        showError(error.message);
    }
}

function renderReturns(returns) {
    contentArea.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h2>Returns Management</h2>
                <button class="btn btn-primary" onclick="showReturnModal()">
                    Process Return
                </button>
            </div>

            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Return ID</th>
                            <th>Original Sale</th>
                            <th>Date</th>
                            <th>Items</th>
                            <th>Reason</th>
                            <th>Refund Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${returns.map(returnRecord => `
                            <tr>
                                <td>${returnRecord.returnNumber || returnRecord.id}</td>
                                <td>${returnRecord.saleId}</td>
                                <td>${SmartStore.formatDateTime(returnRecord.createdAt)}</td>
                                <td>${returnRecord.items.length}</td>
                                <td>${returnRecord.reason || 'N/A'}</td>
                                <td>${SmartStore.formatCurrency(returnRecord.refundAmount || 0)}</td>
                                <td><span class="status-badge ${returnRecord.status}">${returnRecord.status}</span></td>
                                <td>
                                    <div class="table-actions">
                                        ${returnRecord.status === 'pending' ? `
                                            <button class="action-btn action-btn-edit" onclick="processReturn('${returnRecord.id}')">✅</button>
                                        ` : ''}
                                        <button class="action-btn action-btn-view" onclick="viewReturn('${returnRecord.id}')">👁️</button>
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

async function showReturnModal() {
    try {
        const sales = await SmartStore.apiRequest('/sales?limit=100');
        
        const modalHTML = `
            <div class="modal" id="return-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Process Return</h3>
                        <button class="modal-close" onclick="closeReturnModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="return-form">
                            <div class="form-group">
                                <label for="return-sale">Select Sale *</label>
                                <select id="return-sale" class="form-control" required onchange="loadSaleItems(this.value)">
                                    <option value="">Select Sale</option>
                                    ${sales.data.map(sale => `
                                        <option value="${sale.id}">${sale.orderNumber} - ${SmartStore.formatCurrency(sale.total)}</option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div id="return-items" class="form-group">
                                <p>Select a sale to view items</p>
                            </div>
                            
                            <div class="form-group">
                                <label for="return-reason">Reason</label>
                                <textarea id="return-reason" class="form-control" rows="3"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeReturnModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="submitReturn()">Process Return</button>
                    </div>
                </div>
            </div>
        `;
        
        showModalContent(modalHTML);
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function loadSaleItems(saleId) {
    if (!saleId) {
        document.getElementById('return-items').innerHTML = '<p>Select a sale to view items</p>';
        return;
    }
    
    try {
        const result = await SmartStore.apiRequest(`/sales/${saleId}`);
        const sale = result.data;
        
        document.getElementById('return-items').innerHTML = `
            <label>Select Items to Return</label>
            ${sale.items.map((item, index) => `
                <div class="return-item">
                    <label>
                        <input type="checkbox" class="return-item-checkbox" 
                               data-product-id="${item.productId}"
                               data-quantity="${item.quantity}"
                               data-price="${item.price}">
                        ${item.productName} - Qty: ${item.quantity} - $${item.price}
                    </label>
                    <input type="number" class="form-control return-quantity" 
                           min="1" max="${item.quantity}" value="1" 
                           data-product-id="${item.productId}">
                </div>
            `).join('')}
        `;
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

function closeReturnModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.style.display = 'none';
    modalContainer.innerHTML = '';
}

async function submitReturn() {
    const saleId = document.getElementById('return-sale').value;
    const reason = document.getElementById('return-reason').value;
    
    if (!saleId) {
        SmartStore.showToast('Please select a sale', 'error');
        return;
    }
    
    const items = [];
    const checkboxes = document.querySelectorAll('.return-item-checkbox:checked');
    
    if (checkboxes.length === 0) {
        SmartStore.showToast('Please select at least one item to return', 'error');
        return;
    }
    
    checkboxes.forEach(checkbox => {
        const productId = checkbox.dataset.productId;
        const quantityInput = document.querySelector(`.return-quantity[data-product-id="${productId}"]`);
        const quantity = parseInt(quantityInput?.value || 1);
        
        items.push({
            productId,
            quantity
        });
    });
    
    try {
        await SmartStore.apiRequest('/returns', 'POST', {
            saleId,
            items,
            reason
        });
        
        SmartStore.showToast('Return created successfully');
        closeReturnModal();
        loadReturns();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function processReturn(returnId) {
    if (!confirm('Process this return? Items will be returned to stock.')) {
        return;
    }
    
    try {
        await SmartStore.apiRequest(`/returns/${returnId}/process`, 'PATCH');
        SmartStore.showToast('Return processed successfully');
        loadReturns();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function viewReturn(returnId) {
    try {
        const result = await SmartStore.apiRequest(`/returns/${returnId}`);
        const returnRecord = result.data;
        
        const modalHTML = `
            <div class="modal" id="return-view-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Return Details</h3>
                        <button class="modal-close" onclick="closeReturnModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <p><strong>Return ID:</strong> ${returnRecord.returnNumber || returnRecord.id}</p>
                        <p><strong>Sale ID:</strong> ${returnRecord.saleId}</p>
                        <p><strong>Date:</strong> ${SmartStore.formatDateTime(returnRecord.createdAt)}</p>
                        <p><strong>Status:</strong> ${returnRecord.status}</p>
                        <p><strong>Reason:</strong> ${returnRecord.reason || 'N/A'}</p>
                        <hr>
                        <h5>Items</h5>
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${returnRecord.items.map(item => `
                                    <tr>
                                        <td>${item.productName}</td>
                                        <td>${item.quantity}</td>
                                        <td>${SmartStore.formatCurrency(item.price)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <p><strong>Refund Amount:</strong> ${SmartStore.formatCurrency(returnRecord.refundAmount || 0)}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeReturnModal()">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        showModalContent(modalHTML);
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}