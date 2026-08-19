// Expenses Management JavaScript
let editingExpenseId = null;

async function loadExpenses() {
    showLoading();
    
    try {
        const result = await SmartStore.apiRequest('/expenses');
        renderExpenses(result.data);
    } catch (error) {
        showError(error.message);
    }
}

function renderExpenses(expenses) {
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    contentArea.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h2>Expense Management</h2>
                <button class="btn btn-primary" onclick="showAddExpenseModal()">
                    + Add Expense
                </button>
            </div>

            <div class="inventory-summary">
                <div class="summary-card">
                    <h3>Total Expenses</h3>
                    <p>${SmartStore.formatCurrency(totalExpenses)}</p>
                </div>
                <div class="summary-card">
                    <h3>Total Count</h3>
                    <p>${expenses.length}</p>
                </div>
            </div>

            <div class="filter-bar">
                <input type="date" id="expense-date-from" class="form-control">
                <input type="date" id="expense-date-to" class="form-control">
                <select id="expense-category" class="form-control" onchange="filterExpensesByCategory(this.value)">
                    <option value="">All Categories</option>
                    <option value="rent">Rent</option>
                    <option value="utilities">Utilities</option>
                    <option value="salaries">Salaries</option>
                    <option value="supplies">Supplies</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="marketing">Marketing</option>
                    <option value="insurance">Insurance</option>
                    <option value="taxes">Taxes</option>
                    <option value="other">Other</option>
                </select>
                <button class="btn btn-primary" onclick="filterExpensesByDate()">Filter</button>
            </div>

            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Category</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Payment Method</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${expenses.map(expense => `
                            <tr>
                                <td>${SmartStore.formatDate(expense.date)}</td>
                                <td><span class="status-badge active">${expense.category}</span></td>
                                <td>${expense.description}</td>
                                <td>${SmartStore.formatCurrency(expense.amount)}</td>
                                <td>${expense.paymentMethod || 'N/A'}</td>
                                <td>
                                    <div class="table-actions">
                                        <button class="action-btn action-btn-edit" onclick="editExpense('${expense.id}')">✏️</button>
                                        <button class="action-btn action-btn-delete" onclick="deleteExpense('${expense.id}')">🗑️</button>
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

function filterExpensesByCategory(category) {
    const rows = document.querySelectorAll('.table tbody tr');
    rows.forEach(row => {
        if (!category) {
            row.style.display = '';
        } else {
            const categoryCell = row.querySelector('.status-badge');
            row.style.display = categoryCell && categoryCell.textContent === category ? '' : 'none';
        }
    });
}

function filterExpensesByDate() {
    const from = document.getElementById('expense-date-from').value;
    const to = document.getElementById('expense-date-to').value;
    
    const rows = document.querySelectorAll('.table tbody tr');
    rows.forEach(row => {
        const dateCell = row.querySelector('td:first-child');
        if (dateCell) {
            const date = new Date(dateCell.textContent);
            if ((!from || date >= new Date(from)) && (!to || date <= new Date(to))) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

function showAddExpenseModal() {
    editingExpenseId = null;
    
    const modalHTML = `
        <div class="modal" id="expense-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Expense</h3>
                    <button class="modal-close" onclick="closeExpenseModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="expense-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="expense-category-input">Category *</label>
                                <select id="expense-category-input" class="form-control" required>
                                    <option value="">Select Category</option>
                                    <option value="rent">Rent</option>
                                    <option value="utilities">Utilities</option>
                                    <option value="salaries">Salaries</option>
                                    <option value="supplies">Supplies</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="marketing">Marketing</option>
                                    <option value="insurance">Insurance</option>
                                    <option value="taxes">Taxes</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="expense-amount">Amount *</label>
                                <input type="number" id="expense-amount" class="form-control" min="0" step="0.01" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="expense-description">Description *</label>
                            <input type="text" id="expense-description" class="form-control" required>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="expense-date">Date</label>
                                <input type="date" id="expense-date" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="form-group">
                                <label for="expense-payment-method">Payment Method</label>
                                <select id="expense-payment-method" class="form-control">
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="check">Check</option>
                                </select>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeExpenseModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveExpense()">Save Expense</button>
                </div>
            </div>
        </div>
    `;
    
    showModalContent(modalHTML);
}

function closeExpenseModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.style.display = 'none';
    modalContainer.innerHTML = '';
}

async function saveExpense() {
    const expenseData = {
        category: document.getElementById('expense-category-input').value,
        amount: parseFloat(document.getElementById('expense-amount').value),
        description: document.getElementById('expense-description').value.trim(),
        date: document.getElementById('expense-date').value,
        paymentMethod: document.getElementById('expense-payment-method').value
    };
    
    if (!expenseData.category || !expenseData.amount || !expenseData.description) {
        SmartStore.showToast('Please fill all required fields', 'error');
        return;
    }
    
    try {
        if (editingExpenseId) {
            await SmartStore.apiRequest(`/expenses/${editingExpenseId}`, 'PUT', expenseData);
            SmartStore.showToast('Expense updated successfully');
        } else {
            await SmartStore.apiRequest('/expenses', 'POST', expenseData);
            SmartStore.showToast('Expense created successfully');
        }
        
        closeExpenseModal();
        loadExpenses();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function editExpense(expenseId) {
    try {
        const result = await SmartStore.apiRequest(`/expenses/${expenseId}`);
        const expense = result.data;
        editingExpenseId = expenseId;
        
        const modalHTML = `
            <div class="modal" id="expense-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Edit Expense</h3>
                        <button class="modal-close" onclick="closeExpenseModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="expense-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="expense-category-input">Category *</label>
                                    <select id="expense-category-input" class="form-control" required>
                                        <option value="">Select Category</option>
                                        ${['rent', 'utilities', 'salaries', 'supplies', 'maintenance', 'marketing', 'insurance', 'taxes', 'other']
                                            .map(cat => `<option value="${cat}" ${expense.category === cat ? 'selected' : ''}>${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`)
                                            .join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="expense-amount">Amount *</label>
                                    <input type="number" id="expense-amount" class="form-control" min="0" step="0.01" value="${expense.amount}" required>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="expense-description">Description *</label>
                                <input type="text" id="expense-description" class="form-control" value="${expense.description}" required>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="expense-date">Date</label>
                                    <input type="date" id="expense-date" class="form-control" value="${expense.date}">
                                </div>
                                <div class="form-group">
                                    <label for="expense-payment-method">Payment Method</label>
                                    <select id="expense-payment-method" class="form-control">
                                        ${['cash', 'card', 'bank_transfer', 'check']
                                            .map(method => `<option value="${method}" ${expense.paymentMethod === method ? 'selected' : ''}>${method.replace('_', ' ').toUpperCase()}</option>`)
                                            .join('')}
                                    </select>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeExpenseModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="saveExpense()">Update Expense</button>
                    </div>
                </div>
            </div>
        `;
        
        showModalContent(modalHTML);
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

async function deleteExpense(expenseId) {
    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }
    
    try {
        await SmartStore.apiRequest(`/expenses/${expenseId}`, 'DELETE');
        SmartStore.showToast('Expense deleted successfully');
        loadExpenses();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}