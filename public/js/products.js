// Products JavaScript
let productsPage = 1;
let productsLimit = 20;
let productsFilter = {};
let editingProductId = null;

async function loadProducts() {
    showLoading();
    
    try {
        const queryString = new URLSearchParams({
            page: productsPage,
            limit: productsLimit,
            ...productsFilter
        }).toString();
        
        const result = await SmartStore.apiRequest(`/products?${queryString}`);
        renderProducts(result);
    } catch (error) {
        showError(error.message);
    }
}

function renderProducts(result) {
    const products = result.data;
    
    contentArea.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h2>Product Management</h2>
                <div class="header-actions">
                    <button class="btn btn-primary" onclick="showAddProductModal()">
                        + Add Product
                    </button>
                </div>
            </div>

            <!-- Search and Filter -->
            <div class="filter-bar">
                <div class="search-box">
                    <input type="text" id="product-search" class="form-control" 
                           placeholder="Search products..." 
                           onkeyup="searchProducts(this.value)">
                    <span class="search-icon">🔍</span>
                </div>
                <select id="category-filter" class="form-control" onchange="filterByCategory(this.value)">
                    <option value="">All Categories</option>
                </select>
                <select id="status-filter" class="form-control" onchange="filterByStatus(this.value)">
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="low-stock">Low Stock</option>
                    <option value="out-of-stock">Out of Stock</option>
                </select>
            </div>

            <!-- Products Table -->
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Cost</th>
                            <th>Stock</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(product => `
                            <tr>
                                <td>
                                    <div class="cell-product">
                                        <div class="cell-product-icon">📦</div>
                                        <div class="cell-product-info">
                                            <div class="cell-product-name">${product.name}</div>
                                            <div class="cell-product-sku">${product.sku}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>${product.sku}</td>
                                <td>${product.categoryName}</td>
                                <td>${SmartStore.formatCurrency(product.price)}</td>
                                <td>${SmartStore.formatCurrency(product.costPrice)}</td>
                                <td>
                                    <div class="stock-indicator">
                                        <span>${product.quantity}</span>
                                        <div class="stock-bar">
                                            <div class="stock-bar-fill ${product.stockStatus}" 
                                                 style="width: ${Math.min(100, (product.quantity / (product.reorderLevel * 2)) * 100)}%">
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td><span class="status-badge ${product.stockStatus}">${product.stockStatus}</span></td>
                                <td>
                                    <div class="table-actions">
                                        <button class="action-btn action-btn-view" onclick="viewProduct('${product.id}')" title="View">
                                            👁️
                                        </button>
                                        <button class="action-btn action-btn-edit" onclick="editProduct('${product.id}')" title="Edit">
                                            ✏️
                                        </button>
                                        <button class="action-btn action-btn-delete" onclick="deleteProduct('${product.id}')" title="Delete">
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="pagination">
                <button class="pagination-btn" onclick="changePage(${productsPage - 1})" 
                        ${productsPage <= 1 ? 'disabled' : ''}>←</button>
                <span class="pagination-info">Page ${result.pagination.page} of ${result.pagination.pages}</span>
                <button class="pagination-btn" onclick="changePage(${productsPage + 1})" 
                        ${productsPage >= result.pagination.pages ? 'disabled' : ''}>→</button>
            </div>
        </div>
    `;
    
    // Load categories for filter
    loadCategoriesForFilter();
}

function loadCategoriesForFilter() {
    SmartStore.apiRequest('/categories')
        .then(result => {
            const select = document.getElementById('category-filter');
            result.data.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Error loading categories:', error));
}

function searchProducts(query) {
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
        productsFilter.search = query;
        productsPage = 1;
        loadProducts();
    }, 500);
}

function filterByCategory(categoryId) {
    productsFilter.category = categoryId;
    productsPage = 1;
    loadProducts();
}

function filterByStatus(status) {
    productsFilter.status = status;
    productsPage = 1;
    loadProducts();
}

function changePage(page) {
    productsPage = page;
    loadProducts();
}

function showAddProductModal() {
    editingProductId = null;
    
    const modalHTML = `
        <div class="modal" id="product-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Product</h3>
                    <button class="modal-close" onclick="closeProductModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="product-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="product-name">Product Name *</label>
                                <input type="text" id="product-name" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label for="product-sku">SKU *</label>
                                <input type="text" id="product-sku" class="form-control" required>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="product-category">Category</label>
                                <select id="product-category" class="form-control">
                                    <option value="">Select Category</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="product-barcode">Barcode</label>
                                <input type="text" id="product-barcode" class="form-control">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="product-price">Selling Price *</label>
                                <input type="number" id="product-price" class="form-control" step="0.01" min="0" required>
                            </div>
                            <div class="form-group">
                                <label for="product-cost">Cost Price *</label>
                                <input type="number" id="product-cost" class="form-control" step="0.01" min="0" required>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="product-quantity">Initial Stock</label>
                                <input type="number" id="product-quantity" class="form-control" min="0" value="0">
                            </div>
                            <div class="form-group">
                                <label for="product-reorder">Reorder Level</label>
                                <input type="number" id="product-reorder" class="form-control" min="0" value="10">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="product-description">Description</label>
                            <textarea id="product-description" class="form-control" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeProductModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveProduct()">Save Product</button>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = modalHTML;
    modalContainer.style.display = 'flex';
    
    // Load categories
    loadCategoriesForModal();
}

function loadCategoriesForModal() {
    SmartStore.apiRequest('/categories')
        .then(result => {
            const select = document.getElementById('product-category');
            result.data.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Error loading categories:', error));
}

function closeProductModal() {
    document.getElementById('modal-container').style.display = 'none';
    document.getElementById('modal-container').innerHTML = '';
}

async function saveProduct() {
    const productData = {
        name: document.getElementById('product-name').value,
        sku: document.getElementById('product-sku').value,
        categoryId: document.getElementById('product-category').value,
        barcode: document.getElementById('product-barcode').value,
        price: parseFloat(document.getElementById('product-price').value),
        costPrice: parseFloat(document.getElementById('product-cost').value),
        quantity: parseInt(document.getElementById('product-quantity').value),
        reorderLevel: parseInt(document.getElementById('product-reorder').value),
        description: document.getElementById('product-description').value
    };
    
    try {
        if (editingProductId) {
            await SmartStore.apiRequest(`/products/${editingProductId}`, 'PUT', productData);
            SmartStore.showToast('Product updated successfully');
        } else {
            await SmartStore.apiRequest('/products', 'POST', productData);
            SmartStore.showToast('Product created successfully');
        }
        
        closeProductModal();
        loadProducts();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function editProduct(productId) {
    try {
        const result = await SmartStore.apiRequest(`/products/${productId}`);
        const product = result.data;
        editingProductId = productId;
        
        const modalHTML = `
            <div class="modal" id="product-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Edit Product</h3>
                        <button class="modal-close" onclick="closeProductModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="product-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="product-name">Product Name *</label>
                                    <input type="text" id="product-name" class="form-control" value="${product.name}" required>
                                </div>
                                <div class="form-group">
                                    <label for="product-sku">SKU *</label>
                                    <input type="text" id="product-sku" class="form-control" value="${product.sku}" required>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="product-category">Category</label>
                                    <select id="product-category" class="form-control">
                                        <option value="">Select Category</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="product-barcode">Barcode</label>
                                    <input type="text" id="product-barcode" class="form-control" value="${product.barcode || ''}">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="product-price">Selling Price *</label>
                                    <input type="number" id="product-price" class="form-control" step="0.01" min="0" value="${product.price}" required>
                                </div>
                                <div class="form-group">
                                    <label for="product-cost">Cost Price *</label>
                                    <input type="number" id="product-cost" class="form-control" step="0.01" min="0" value="${product.costPrice}" required>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="product-quantity">Stock</label>
                                    <input type="number" id="product-quantity" class="form-control" min="0" value="${product.quantity}">
                                </div>
                                <div class="form-group">
                                    <label for="product-reorder">Reorder Level</label>
                                    <input type="number" id="product-reorder" class="form-control" min="0" value="${product.reorderLevel}">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="product-description">Description</label>
                                <textarea id="product-description" class="form-control" rows="3">${product.description || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeProductModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="saveProduct()">Update Product</button>
                    </div>
                </div>
            </div>
        `;
        
        const modalContainer = document.getElementById('modal-container');
        modalContainer.innerHTML = modalHTML;
        modalContainer.style.display = 'flex';
        
        // Load categories and select current
        const categoriesResult = await SmartStore.apiRequest('/categories');
        const select = document.getElementById('product-category');
        categoriesResult.data.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            if (category.id === product.categoryId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function viewProduct(productId) {
    try {
        const result = await SmartStore.apiRequest(`/products/${productId}`);
        const product = result.data;
        
        const modalHTML = `
            <div class="modal" id="product-view-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Product Details</h3>
                        <button class="modal-close" onclick="closeProductModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="product-details">
                            <h4>${product.name}</h4>
                            <p><strong>SKU:</strong> ${product.sku}</p>
                            <p><strong>Category:</strong> ${product.categoryName}</p>
                            <p><strong>Price:</strong> ${SmartStore.formatCurrency(product.price)}</p>
                            <p><strong>Cost:</strong> ${SmartStore.formatCurrency(product.costPrice)}</p>
                            <p><strong>Stock:</strong> ${product.quantity}</p>
                            <p><strong>Status:</strong> ${product.stockStatus}</p>
                            <p><strong>Description:</strong> ${product.description || 'N/A'}</p>
                            <p><strong>Created:</strong> ${SmartStore.formatDateTime(product.createdAt)}</p>
                            <p><strong>Updated:</strong> ${SmartStore.formatDateTime(product.updatedAt)}</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeProductModal()">Close</button>
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

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
    try {
        await SmartStore.apiRequest(`/products/${productId}`, 'DELETE');
        SmartStore.showToast('Product deleted successfully');
        loadProducts();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}