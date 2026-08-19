// Users Management JavaScript
async function loadUsers() {
    // Only admin can access this page
    if (SmartStore.currentUser?.role !== 'admin') {
        contentArea.innerHTML = `
            <div class="alert alert-error">
                Access denied. Admin privileges required.
            </div>
        `;
        return;
    }
    
    showLoading();
    
    try {
        const result = await SmartStore.apiRequest('/auth/users');
        renderUsers(result);
    } catch (error) {
        showError(error.message);
    }
}

function renderUsers(users) {
    contentArea.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h2>User Management</h2>
                <button class="btn btn-primary" onclick="showAddUserModal()">
                    + Add User
                </button>
            </div>

            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td>
                                    <div class="cell-user">
                                        <div class="cell-user-avatar">${user.name.charAt(0)}</div>
                                        <div class="cell-user-info">
                                            <div class="cell-user-name">${user.name}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>${user.email}</td>
                                <td><span class="status-badge ${user.role}">${user.role}</span></td>
                                <td><span class="status-badge ${user.active ? 'active' : 'inactive'}">${user.active ? 'Active' : 'Inactive'}</span></td>
                                <td>${SmartStore.formatDate(user.createdAt)}</td>
                                <td>
                                    <div class="table-actions">
                                        <button class="action-btn action-btn-edit" onclick="editUser('${user.id}')">✏️</button>
                                        <button class="action-btn action-btn-${user.active ? 'delete' : 'view'}" 
                                                onclick="toggleUserStatus('${user.id}', ${!user.active})">
                                            ${user.active ? '🚫' : '✅'}
                                        </button>
                                        <button class="action-btn action-btn-delete" onclick="deleteUser('${user.id}')">🗑️</button>
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

function showAddUserModal() {
    const modalHTML = `
        <div class="modal" id="user-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add User</h3>
                    <button class="modal-close" onclick="closeUserModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="user-form">
                        <div class="form-group">
                            <label for="user-name">Name *</label>
                            <input type="text" id="user-name" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="user-email">Email *</label>
                            <input type="email" id="user-email" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="user-password">Password *</label>
                            <input type="password" id="user-password" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="user-role">Role</label>
                            <select id="user-role" class="form-control">
                                <option value="cashier">Cashier</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeUserModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveUser()">Save User</button>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = modalHTML;
    modalContainer.style.display = 'flex';
}

function closeUserModal() {
    document.getElementById('modal-container').style.display = 'none';
    document.getElementById('modal-container').innerHTML = '';
}

async function saveUser() {
    const userData = {
        name: document.getElementById('user-name').value,
        email: document.getElementById('user-email').value,
        password: document.getElementById('user-password').value,
        role: document.getElementById('user-role').value
    };
    
    try {
        await SmartStore.apiRequest('/auth/register', 'POST', userData);
        SmartStore.showToast('User created successfully');
        closeUserModal();
        loadUsers();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function toggleUserStatus(userId, activate) {
    try {
        const endpoint = activate ? 'activate' : 'deactivate';
        await SmartStore.apiRequest(`/auth/users/${userId}/${endpoint}`, 'PUT');
        SmartStore.showToast(`User ${activate ? 'activated' : 'deactivated'} successfully`);
        loadUsers();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }
    
    try {
        await SmartStore.apiRequest(`/auth/users/${userId}`, 'DELETE');
        SmartStore.showToast('User deleted successfully');
        loadUsers();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}