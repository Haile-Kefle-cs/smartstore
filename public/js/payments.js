// Payments Management JavaScript
async function loadPayments() {
    showLoading();
    
    try {
        const result = await SmartStore.apiRequest('/payments');
        renderPayments(result.data);
    } catch (error) {
        showError(error.message);
    }
}

function renderPayments(payments) {
    const totalReceived = payments
        .filter(p => p.amount > 0)
        .reduce((sum, p) => sum + p.amount, 0);
    
    const totalRefunded = payments
        .filter(p => p.amount < 0)
        .reduce((sum, p) => sum + Math.abs(p.amount), 0);
    
    contentArea.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h2>Payment History</h2>
            </div>

            <div class="inventory-summary">
                <div class="summary-card">
                    <h3>Total Received</h3>
                    <p>${SmartStore.formatCurrency(totalReceived)}</p>
                </div>
                <div class="summary-card">
                    <h3>Total Refunded</h3>
                    <p>${SmartStore.formatCurrency(totalRefunded)}</p>
                </div>
                <div class="summary-card">
                    <h3>Net Amount</h3>
                    <p>${SmartStore.formatCurrency(totalReceived - totalRefunded)}</p>
                </div>
            </div>

            <div class="filter-bar">
                <input type="date" id="payment-date-from" class="form-control">
                <input type="date" id="payment-date-to" class="form-control">
                <select id="payment-method-filter" class="form-control" onchange="filterPaymentsByMethod(this.value)">
                    <option value="">All Methods</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="mobile">Mobile</option>
                    <option value="refund">Refund</option>
                </select>
                <button class="btn btn-primary" onclick="filterPaymentsByDate()">Filter</button>
            </div>

            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Reference</th>
                            <th>Method</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.map(payment => `
                            <tr>
                                <td>${SmartStore.formatDateTime(payment.createdAt)}</td>
                                <td>${payment.reference || 'N/A'}</td>
                                <td>${payment.method}</td>
                                <td class="${payment.amount < 0 ? 'text-danger' : 'text-success'}">
                                    ${payment.amount < 0 ? '-' : ''}${SmartStore.formatCurrency(Math.abs(payment.amount))}
                                </td>
                                <td><span class="status-badge ${payment.status}">${payment.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function filterPaymentsByMethod(method) {
    const rows = document.querySelectorAll('.table tbody tr');
    rows.forEach(row => {
        if (!method) {
            row.style.display = '';
        } else {
            const methodCell = row.querySelector('td:nth-child(3)');
            row.style.display = methodCell && methodCell.textContent === method ? '' : 'none';
        }
    });
}

function filterPaymentsByDate() {
    const from = document.getElementById('payment-date-from').value;
    const to = document.getElementById('payment-date-to').value;
    
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