// Categories Management JavaScript
let editingCategoryId = null;

async function loadCategories() {
    showLoading();
    
    try {
        const result = await SmartStore.apiRequest('/categories');
        renderCategories(result.data);
    } catch (error) {
        showError(error.message);
    }
}

function renderCategories(categories) {
    contentArea.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h2>Category Management</h2>
                <button class="btn btn-primary" onclick="showAddCategoryModal()">
                    + Add Category
                </button>
            </div>

            <div class="categories-grid" id="categories-grid">
                ${categories.map(category => `
                    <div class="category-card">
                        <div class="category-icon">🏷️</div>
                        <div class="category-info">
                            <h3>${category.name}</h3>
                            <p>${category.description || 'No description'}</p>
                            <div class="category-stats">
                                <span class="badge">${category.productCount || 0} products</span>
                                <span class="status-badge ${category.active ? 'active' : 'inactive'}">
                                    ${category.active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                        <div class="category-actions">
                            <button class="action-btn action-btn-edit" onclick="editCategory('${category.id}')" title="Edit">
                                ✏️
                            </button>
                            <button class="action-btn action-btn-${category.active ? 'delete' : 'view'}" 
                                    onclick="toggleCategoryStatus('${category.id}')" 
                                    title="${category.active ? 'Deactivate' : 'Activate'}">
                                ${category.active ? '🚫' : '✅'}
                            </button>
                            <button class="action-btn action-btn-delete" onclick="deleteCategory('${category.id}')" title="Delete">
                                🗑️
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function showAddCategoryModal() {
    editingCategoryId = null;
    
    const modalHTML = `
        <div class="modal" id="category-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Category</h3>
                    <button class="modal-close" onclick="closeCategoryModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="category-form">
                        <div class="form-group">
                            <label for="category-name">Category Name *</label>
                            <input type="text" id="category-name" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="category-description">Description</label>
                            <textarea id="category-description" class="form-control" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeCategoryModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveCategory()">Save Category</button>
                </div>
            </div>
        </div>
    `;
    
    showModalContent(modalHTML);
}

function showModalContent(html) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = html;
    modalContainer.style.display = 'flex';
}

function closeCategoryModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.style.display = 'none';
    modalContainer.innerHTML = '';
}

async function saveCategory() {
    const categoryData = {
        name: document.getElementById('category-name').value.trim(),
        description: document.getElementById('category-description').value.trim()
    };
    
    if (!categoryData.name) {
        SmartStore.showToast('Category name is required', 'error');
        return;
    }
    
    try {
        if (editingCategoryId) {
            await SmartStore.apiRequest(`/categories/${editingCategoryId}`, 'PUT', categoryData);
            SmartStore.showToast('Category updated successfully');
        } else {
            await SmartStore.apiRequest('/categories', 'POST', categoryData);
            SmartStore.showToast('Category created successfully');
        }
        
        closeCategoryModal();
        loadCategories();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function editCategory(categoryId) {
    try {
        const result = await SmartStore.apiRequest(`/categories/${categoryId}`);
        const category = result.data;
        editingCategoryId = categoryId;
        
        const modalHTML = `
            <div class="modal" id="category-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Edit Category</h3>
                        <button class="modal-close" onclick="closeCategoryModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="category-form">
                            <div class="form-group">
                                <label for="category-name">Category Name *</label>
                                <input type="text" id="category-name" class="form-control" 
                                       value="${category.name}" required>
                            </div>
                            <div class="form-group">
                                <label for="category-description">Description</label>
                                <textarea id="category-description" class="form-control" rows="3">${category.description || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeCategoryModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="saveCategory()">Update Category</button>
                    </div>
                </div>
            </div>
        `;
        
        showModalContent(modalHTML);
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function toggleCategoryStatus(categoryId) {
    try {
        await SmartStore.apiRequest(`/categories/${categoryId}/status`, 'PATCH');
        SmartStore.showToast('Category status updated');
        loadCategories();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) {
        return;
    }
    
    try {
        await SmartStore.apiRequest(`/categories/${categoryId}`, 'DELETE');
        SmartStore.showToast('Category deleted successfully');
        loadCategories();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}