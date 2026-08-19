// Suppliers Management JavaScript
let editingSupplierId = null;

async function loadSuppliers() {
    showLoading();
    
    try {
        const result = await SmartStore.apiRequest('/suppliers');
        renderSuppliers(result.data);
    } catch (error) {
        showError(error.message);
    }
}

function renderSuppliers(suppliers) {
    contentArea.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h2>Supplier Management</h2>
                <button class="btn btn-primary" onclick="showAddSupplierModal()">
                    + Add Supplier
                </button>
            </div>

            <div class="filter-bar">
                <div class="search-box">
                    <input type="text" id="supplier-search" class="form-control" 
                           placeholder="Search suppliers..." 
                           onkeyup="searchSuppliers(this.value)">
                    <span class="search-icon">🔍</span>
                </div>
            </div>

            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Company</th>
                            <th>Contact Person</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Payment Terms</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${suppliers.map(supplier => `
                            <tr>
                                <td>${supplier.companyName}</td>
                                <td>${supplier.contactPerson}</td>
                                <td>${supplier.email || 'N/A'}</td>
                                <td>${supplier.phone || 'N/A'}</td>
                                <td>${supplier.paymentTerms || 'N/A'}</td>
                                <td><span class="status-badge ${supplier.active ? 'active' : 'inactive'}">${supplier.active ? 'Active' : 'Inactive'}</span></td>
                                <td>
                                    <div class="table-actions">
                                        <button class="action-btn action-btn-view" onclick="viewSupplier('${supplier.id}')">👁️</button>
                                        <button class="action-btn action-btn-edit" onclick="editSupplier('${supplier.id}')">✏️</button>
                                        <button class="action-btn action-btn-delete" onclick="deleteSupplier('${supplier.id}')">🗑️</button>
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

function searchSuppliers(query) {
    const rows = document.querySelectorAll('.table tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
}

function showAddSupplierModal() {
    editingSupplierId = null;
    
    const modalHTML = `
        <div class="modal" id="supplier-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Supplier</h3>
                    <button class="modal-close" onclick="closeSupplierModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="supplier-form">
                        <div class="form-group">
                            <label for="supplier-company">Company Name *</label>
                            <input type="text" id="supplier-company" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="supplier-contact">Contact Person *</label>
                            <input type="text" id="supplier-contact" class="form-control" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="supplier-email">Email</label>
                                <input type="email" id="supplier-email" class="form-control">
                            </div>
                            <div class="form-group">
                                <label for="supplier-phone">Phone</label>
                                <input type="text" id="supplier-phone" class="form-control">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="supplier-address">Address</label>
                            <textarea id="supplier-address" class="form-control" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="supplier-terms">Payment Terms</label>
                            <select id="supplier-terms" class="form-control">
                                <option value="Net 15">Net 15</option>
                                <option value="Net 30">Net 30</option>
                                <option value="Net 45">Net 45</option>
                                <option value="Net 60">Net 60</option>
                                <option value="Cash on Delivery">Cash on Delivery</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeSupplierModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveSupplier()">Save Supplier</button>
                </div>
            </div>
        </div>
    `;
    
    showModalContent(modalHTML);
}

function closeSupplierModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.style.display = 'none';
    modalContainer.innerHTML = '';
}

async function saveSupplier() {
    const supplierData = {
        companyName: document.getElementById('supplier-company').value.trim(),
        contactPerson: document.getElementById('supplier-contact').value.trim(),
        email: document.getElementById('supplier-email').value.trim(),
        phone: document.getElementById('supplier-phone').value.trim(),
        address: document.getElementById('supplier-address').value.trim(),
        paymentTerms: document.getElementById('supplier-terms').value
    };
    
    if (!supplierData.companyName || !supplierData.contactPerson) {
        SmartStore.showToast('Company name and contact person are required', 'error');
        return;
    }
    
    try {
        if (editingSupplierId) {
            await SmartStore.apiRequest(`/suppliers/${editingSupplierId}`, 'PUT', supplierData);
            SmartStore.showToast('Supplier updated successfully');
        } else {
            await SmartStore.apiRequest('/suppliers', 'POST', supplierData);
            SmartStore.showToast('Supplier created successfully');
        }
        
        closeSupplierModal();
        loadSuppliers();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function editSupplier(supplierId) {
    try {
        const result = await SmartStore.apiRequest(`/suppliers/${supplierId}`);
        const supplier = result.data;
        editingSupplierId = supplierId;
        
        const modalHTML = `
            <div class="modal" id="supplier-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Edit Supplier</h3>
                        <button class="modal-close" onclick="closeSupplierModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="supplier-form">
                            <div class="form-group">
                                <label for="supplier-company">Company Name *</label>
                                <input type="text" id="supplier-company" class="form-control" value="${supplier.companyName}" required>
                            </div>
                            <div class="form-group">
                                <label for="supplier-contact">Contact Person *</label>
                                <input type="text" id="supplier-contact" class="form-control" value="${supplier.contactPerson}" required>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="supplier-email">Email</label>
                                    <input type="email" id="supplier-email" class="form-control" value="${supplier.email || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="supplier-phone">Phone</label>
                                    <input type="text" id="supplier-phone" class="form-control" value="${supplier.phone || ''}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="supplier-address">Address</label>
                                <textarea id="supplier-address" class="form-control" rows="3">${supplier.address || ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label for="supplier-terms">Payment Terms</label>
                                <select id="supplier-terms" class="form-control">
                                    <option value="Net 15" ${supplier.paymentTerms === 'Net 15' ? 'selected' : ''}>Net 15</option>
                                    <option value="Net 30" ${supplier.paymentTerms === 'Net 30' ? 'selected' : ''}>Net 30</option>
                                    <option value="Net 45" ${supplier.paymentTerms === 'Net 45' ? 'selected' : ''}>Net 45</option>
                                    <option value="Net 60" ${supplier.paymentTerms === 'Net 60' ? 'selected' : ''}>Net 60</option>
                                    <option value="Cash on Delivery" ${supplier.paymentTerms === 'Cash on Delivery' ? 'selected' : ''}>Cash on Delivery</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeSupplierModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="saveSupplier()">Update Supplier</button>
                    </div>
                </div>
            </div>
        `;
        
        showModalContent(modalHTML);
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function viewSupplier(supplierId) {
    try {
        const [supplierResult, purchasesResult] = await Promise.all([
            SmartStore.apiRequest(`/suppliers/${supplierId}`),
            SmartStore.apiRequest(`/suppliers/${supplierId}/purchases`)
        ]);
        
        const supplier = supplierResult.data;
        const purchases = purchasesResult.data || [];
        
        const modalHTML = `
            <div class="modal" id="supplier-view-modal">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h3>Supplier Details</h3>
                        <button class="modal-close" onclick="closeSupplierModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <h4>${supplier.companyName}</h4>
                        <p><strong>Contact:</strong> ${supplier.contactPerson}</p>
                        <p><strong>Email:</strong> ${supplier.email || 'N/A'}</p>
                        <p><strong>Phone:</strong> ${supplier.phone || 'N/A'}</p>
                        <p><strong>Address:</strong> ${supplier.address || 'N/A'}</p>
                        <p><strong>Payment Terms:</strong> ${supplier.paymentTerms || 'N/A'}</p>
                        <hr>
                        <h5>Purchase History</h5>
                        ${purchases.length > 0 ? `
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>PO Number</th>
                                        <th>Date</th>
                                        <th>Total</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${purchases.map(purchase => `
                                        <tr>
                                            <td>${purchase.orderNumber}</td>
                                            <td>${SmartStore.formatDateTime(purchase.createdAt)}</td>
                                            <td>${SmartStore.formatCurrency(purchase.total)}</td>
                                            <td>${purchase.status}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : '<p>No purchase history</p>'}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeSupplierModal()">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        showModalContent(modalHTML);
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function deleteSupplier(supplierId) {
    if (!confirm('Are you sure you want to delete this supplier?')) {
        return;
    }
    
    try {
        await SmartStore.apiRequest(`/suppliers/${supplierId}`, 'DELETE');
        SmartStore.showToast('Supplier deleted successfully');
        loadSuppliers();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}