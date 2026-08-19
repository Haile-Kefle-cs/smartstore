// Customers Management JavaScript
let editingCustomerId = null;

async function loadCustomers() {
    showLoading();
    
    try {
        const result = await SmartStore.apiRequest('/customers');
        renderCustomers(result.data);
    } catch (error) {
        showError(error.message);
    }
}

function renderCustomers(customers) {
    contentArea.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h2>Customer Management</h2>
                <button class="btn btn-primary" onclick="showAddCustomerModal()">
                    + Add Customer
                </button>
            </div>

            <div class="filter-bar">
                <div class="search-box">
                    <input type="text" id="customer-search" class="form-control" 
                           placeholder="Search customers..." 
                           onkeyup="searchCustomers(this.value)">
                    <span class="search-icon">🔍</span>
                </div>
            </div>

            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Total Purchases</th>
                            <th>Total Spent</th>
                            <th>Loyalty Points</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customers.map(customer => `
                            <tr>
                                <td>
                                    <div class="cell-user">
                                        <div class="cell-user-avatar">${customer.name.charAt(0)}</div>
                                        <div class="cell-user-info">
                                            <div class="cell-user-name">${customer.name}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>${customer.email || 'N/A'}</td>
                                <td>${customer.phone || 'N/A'}</td>
                                <td>${customer.totalPurchases || 0}</td>
                                <td>${SmartStore.formatCurrency(customer.totalSpent || 0)}</td>
                                <td>${customer.loyaltyPoints || 0}</td>
                                <td><span class="status-badge ${customer.active ? 'active' : 'inactive'}">${customer.active ? 'Active' : 'Inactive'}</span></td>
                                <td>
                                    <div class="table-actions">
                                        <button class="action-btn action-btn-view" onclick="viewCustomer('${customer.id}')">👁️</button>
                                        <button class="action-btn action-btn-edit" onclick="editCustomer('${customer.id}')">✏️</button>
                                        <button class="action-btn action-btn-delete" onclick="deleteCustomer('${customer.id}')">🗑️</button>
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

function searchCustomers(query) {
    const rows = document.querySelectorAll('.table tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
}

function showAddCustomerModal() {
    editingCustomerId = null;
    
    const modalHTML = `
        <div class="modal" id="customer-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Customer</h3>
                    <button class="modal-close" onclick="closeCustomerModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="customer-form">
                        <div class="form-group">
                            <label for="customer-name">Name *</label>
                            <input type="text" id="customer-name" class="form-control" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="customer-email">Email</label>
                                <input type="email" id="customer-email" class="form-control">
                            </div>
                            <div class="form-group">
                                <label for="customer-phone">Phone</label>
                                <input type="text" id="customer-phone" class="form-control">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="customer-address">Address</label>
                            <textarea id="customer-address" class="form-control" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeCustomerModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveCustomer()">Save Customer</button>
                </div>
            </div>
        </div>
    `;
    
    showModalContent(modalHTML);
}

function closeCustomerModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.style.display = 'none';
    modalContainer.innerHTML = '';
}

async function saveCustomer() {
    const customerData = {
        name: document.getElementById('customer-name').value.trim(),
        email: document.getElementById('customer-email').value.trim(),
        phone: document.getElementById('customer-phone').value.trim(),
        address: document.getElementById('customer-address').value.trim()
    };
    
    if (!customerData.name) {
        SmartStore.showToast('Customer name is required', 'error');
        return;
    }
    
    try {
        if (editingCustomerId) {
            await SmartStore.apiRequest(`/customers/${editingCustomerId}`, 'PUT', customerData);
            SmartStore.showToast('Customer updated successfully');
        } else {
            await SmartStore.apiRequest('/customers', 'POST', customerData);
            SmartStore.showToast('Customer created successfully');
        }
        
        closeCustomerModal();
        loadCustomers();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function editCustomer(customerId) {
    try {
        const result = await SmartStore.apiRequest(`/customers/${customerId}`);
        const customer = result.data;
        editingCustomerId = customerId;
        
        const modalHTML = `
            <div class="modal" id="customer-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Edit Customer</h3>
                        <button class="modal-close" onclick="closeCustomerModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="customer-form">
                            <div class="form-group">
                                <label for="customer-name">Name *</label>
                                <input type="text" id="customer-name" class="form-control" value="${customer.name}" required>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="customer-email">Email</label>
                                    <input type="email" id="customer-email" class="form-control" value="${customer.email || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="customer-phone">Phone</label>
                                    <input type="text" id="customer-phone" class="form-control" value="${customer.phone || ''}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="customer-address">Address</label>
                                <textarea id="customer-address" class="form-control" rows="3">${customer.address || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeCustomerModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="saveCustomer()">Update Customer</button>
                    </div>
                </div>
            </div>
        `;
        
        showModalContent(modalHTML);
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function viewCustomer(customerId) {
    try {
        const result = await SmartStore.apiRequest(`/customers/${customerId}`);
        const customer = result.data;
        
        // Get customer's sales
        const salesResult = await SmartStore.apiRequest(`/customers/${customerId}/sales`);
        const sales = salesResult.data || [];
        
        const modalHTML = `
            <div class="modal" id="customer-view-modal">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h3>Customer Details</h3>
                        <button class="modal-close" onclick="closeCustomerModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <h4>${customer.name}</h4>
                        <p><strong>Email:</strong> ${customer.email || 'N/A'}</p>
                        <p><strong>Phone:</strong> ${customer.phone || 'N/A'}</p>
                        <p><strong>Address:</strong> ${customer.address || 'N/A'}</p>
                        <hr>
                        <div class="report-stats">
                            <div class="report-stat">
                                <div class="report-stat-label">Total Purchases</div>
                                <div class="report-stat-value">${customer.totalPurchases || 0}</div>
                            </div>
                            <div class="report-stat">
                                <div class="report-stat-label">Total Spent</div>
                                <div class="report-stat-value">${SmartStore.formatCurrency(customer.totalSpent || 0)}</div>
                            </div>
                            <div class="report-stat">
                                <div class="report-stat-label">Loyalty Points</div>
                                <div class="report-stat-value">${customer.loyaltyPoints || 0}</div>
                            </div>
                        </div>
                        
                        <h5>Purchase History</h5>
                        ${sales.length > 0 ? `
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Order #</th>
                                        <th>Date</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sales.map(sale => `
                                        <tr>
                                            <td>${sale.orderNumber}</td>
                                            <td>${SmartStore.formatDateTime(sale.createdAt)}</td>
                                            <td>${SmartStore.formatCurrency(sale.total)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : '<p>No purchase history</p>'}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeCustomerModal()">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        showModalContent(modalHTML);
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function deleteCustomer(customerId) {
    if (!confirm('Are you sure you want to delete this customer?')) {
        return;
    }
    
    try {
        await SmartStore.apiRequest(`/customers/${customerId}`, 'DELETE');
        SmartStore.showToast('Customer deleted successfully');
        loadCustomers();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}