// Settings JavaScript
let currentSettings = null;

async function loadSettings() {
    showLoading();
    
    try {
        const result = await SmartStore.apiRequest('/settings');
        currentSettings = result.data;
        renderSettings(currentSettings);
    } catch (error) {
        // If settings endpoint doesn't exist, try to get from local storage
        const cachedSettings = localStorage.getItem('settings');
        if (cachedSettings) {
            currentSettings = JSON.parse(cachedSettings);
            renderSettings(currentSettings);
        } else {
            showError('Unable to load settings');
        }
    }
}

function renderSettings(settings) {
    contentArea.innerHTML = `
        <div class="settings-container">
            <div class="page-header">
                <h2>Settings</h2>
            </div>

            <form id="settings-form">
                <div class="form-section">
                    <h3 class="form-section-title">Store Information</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="store-name">Store Name</label>
                            <input type="text" id="store-name" class="form-control" value="${settings.storeName || ''}">
                        </div>
                        <div class="form-group">
                            <label for="store-email">Email</label>
                            <input type="email" id="store-email" class="form-control" value="${settings.email || ''}">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="store-phone">Phone</label>
                            <input type="text" id="store-phone" class="form-control" value="${settings.phone || ''}">
                        </div>
                        <div class="form-group">
                            <label for="store-address">Address</label>
                            <input type="text" id="store-address" class="form-control" value="${settings.address || ''}">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3 class="form-section-title">Financial Settings</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="currency">Currency</label>
                            <select id="currency" class="form-control">
                                <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                                <option value="EUR" ${settings.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                                <option value="GBP" ${settings.currency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="tax-rate">Tax Rate (%)</label>
                            <input type="number" id="tax-rate" class="form-control" min="0" max="100" 
                                   value="${settings.taxRate || 0}">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="low-stock-threshold">Low Stock Threshold</label>
                        <input type="number" id="low-stock-threshold" class="form-control" min="0" 
                               value="${settings.lowStockThreshold || 10}">
                    </div>
                </div>

                <div class="form-section">
                    <h3 class="form-section-title">Receipt Settings</h3>
                    
                    <div class="form-group">
                        <label for="receipt-header">Receipt Header</label>
                        <input type="text" id="receipt-header" class="form-control" 
                               value="${settings.receiptHeader || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label for="receipt-footer">Receipt Footer</label>
                        <textarea id="receipt-footer" class="form-control" rows="3">${settings.receiptFooter || ''}</textarea>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="resetSettings()">Reset</button>
                    <button type="submit" class="btn btn-primary">Save Settings</button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('settings-form').addEventListener('submit', saveSettings);
}

async function saveSettings(e) {
    e.preventDefault();
    
    const settingsData = {
        storeName: document.getElementById('store-name').value,
        email: document.getElementById('store-email').value,
        phone: document.getElementById('store-phone').value,
        address: document.getElementById('store-address').value,
        currency: document.getElementById('currency').value,
        taxRate: parseFloat(document.getElementById('tax-rate').value),
        lowStockThreshold: parseInt(document.getElementById('low-stock-threshold').value),
        receiptHeader: document.getElementById('receipt-header').value,
        receiptFooter: document.getElementById('receipt-footer').value
    };
    
    try {
        await SmartStore.apiRequest('/settings', 'PUT', settingsData);
        localStorage.setItem('settings', JSON.stringify(settingsData));
        SmartStore.showToast('Settings saved successfully');
    } catch (error) {
        // If API fails, save locally
        localStorage.setItem('settings', JSON.stringify(settingsData));
        SmartStore.showToast('Settings saved locally', 'warning');
    }
}

function resetSettings() {
    if (currentSettings) {
        renderSettings(currentSettings);
    }
}