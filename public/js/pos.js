// Point of Sale JavaScript
let cart = [];
let selectedCustomer = null;
let paymentMethod = 'cash';
let currentCategory = '';

async function loadPOS() {
    showLoading();
    
    try {
        const [products, customers] = await Promise.all([
            SmartStore.apiRequest('/products?limit=100'),
            SmartStore.apiRequest('/customers')
        ]);
        
        renderPOS(products.data, customers.data);
    } catch (error) {
        showError(error.message);
    }
}

function renderPOS(products, customers) {
    cart = [];
    selectedCustomer = null;
    paymentMethod = 'cash';
    
    contentArea.innerHTML = `
        <div class="pos-container">
            <!-- Products Side -->
            <div class="pos-products">
                <div class="pos-header">
                    <h2>Products</h2>
                    <div class="search-box">
                        <input type="text" id="pos-search" class="form-control" 
                               placeholder="Search products..." onkeyup="searchPOSProducts(this.value)">
                        <span class="search-icon">🔍</span>
                    </div>
                </div>
                
                <div class="products-grid" id="pos-products-grid">
                    ${products.map(product => `
                        <div class="product-card ${product.quantity <= 0 ? 'out-of-stock' : ''}" 
                             onclick="addToCart('${product.id}')">
                            <div class="product-image">📦</div>
                            <div class="product-name">${product.name}</div>
                            <div class="product-price">${SmartStore.formatCurrency(product.price)}</div>
                            <div class="product-stock">Stock: ${product.quantity}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Cart Side -->
            <div class="pos-cart">
                <div class="cart-header">
                    <h2>Current Sale</h2>
                    <button class="btn btn-sm btn-secondary" onclick="clearCart()">Clear</button>
                </div>
                
                <div class="customer-select">
                    <select id="pos-customer" class="form-control" onchange="selectCustomer(this.value)">
                        <option value="">Walk-in Customer</option>
                        ${customers.map(customer => `
                            <option value="${customer.id}">${customer.name}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="cart-items" id="cart-items">
                    <div class="empty-cart">
                        <p>No items in cart</p>
                    </div>
                </div>
                
                <div class="cart-summary">
                    <div class="summary-row">
                        <span>Subtotal:</span>
                        <span id="cart-subtotal">$0.00</span>
                    </div>
                    <div class="summary-row">
                        <span>Tax:</span>
                        <span id="cart-tax">$0.00</span>
                    </div>
                    <div class="summary-row">
                        <span>Discount:</span>
                        <input type="number" id="cart-discount" class="form-control" 
                               min="0" max="100" value="0" onchange="updateCartSummary()">
                        <span>%</span>
                    </div>
                    <div class="summary-row total">
                        <span>Total:</span>
                        <span id="cart-total">$0.00</span>
                    </div>
                </div>
                
                <div class="payment-methods">
                    <h3>Payment Method</h3>
                    <div class="payment-options">
                        <button class="payment-option active" onclick="selectPaymentMethod('cash')">💵 Cash</button>
                        <button class="payment-option" onclick="selectPaymentMethod('card')">💳 Card</button>
                        <button class="payment-option" onclick="selectPaymentMethod('mobile')">📱 Mobile</button>
                    </div>
                </div>
                
                <button class="btn btn-primary btn-block btn-lg" onclick="completeSale()">
                    Complete Sale
                </button>
            </div>
        </div>
    `;
}

function searchPOSProducts(query) {
    const products = document.querySelectorAll('.product-card');
    products.forEach(card => {
        const name = card.querySelector('.product-name').textContent.toLowerCase();
        if (name.includes(query.toLowerCase())) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

function addToCart(productId) {
    SmartStore.apiRequest(`/products/${productId}`)
        .then(result => {
            const product = result.data;
            
            if (product.quantity <= 0) {
                SmartStore.showToast('Product out of stock', 'error');
                return;
            }
            
            const existingItem = cart.find(item => item.productId === productId);
            
            if (existingItem) {
                if (existingItem.quantity >= product.quantity) {
                    SmartStore.showToast('Not enough stock', 'error');
                    return;
                }
                existingItem.quantity++;
            } else {
                cart.push({
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: 1
                });
            }
            
            updateCartDisplay();
        })
        .catch(error => SmartStore.showToast(error.message, 'error'));
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="empty-cart"><p>No items in cart</p></div>';
    } else {
        cartItems.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${SmartStore.formatCurrency(item.price)}</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn" onclick="increaseQuantity(${index})">+</button>
                </div>
                <div class="cart-item-total">${SmartStore.formatCurrency(item.price * item.quantity)}</div>
                <button class="remove-item" onclick="removeFromCart(${index})">×</button>
            </div>
        `).join('');
    }
    
    updateCartSummary();
}

function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountPercent = parseFloat(document.getElementById('cart-discount')?.value || 0);
    const taxRate = 10; // Default tax rate
    const tax = subtotal * (taxRate / 100);
    const discount = subtotal * (discountPercent / 100);
    const total = subtotal + tax - discount;
    
    document.getElementById('cart-subtotal').textContent = SmartStore.formatCurrency(subtotal);
    document.getElementById('cart-tax').textContent = SmartStore.formatCurrency(tax);
    document.getElementById('cart-total').textContent = SmartStore.formatCurrency(total);
}

function increaseQuantity(index) {
    const item = cart[index];
    
    SmartStore.apiRequest(`/products/${item.productId}`)
        .then(result => {
            if (item.quantity >= result.data.quantity) {
                SmartStore.showToast('Not enough stock', 'error');
                return;
            }
            item.quantity++;
            updateCartDisplay();
        })
        .catch(error => SmartStore.showToast(error.message, 'error'));
}

function decreaseQuantity(index) {
    if (cart[index].quantity > 1) {
        cart[index].quantity--;
    } else {
        cart.splice(index, 1);
    }
    updateCartDisplay();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartDisplay();
}

function clearCart() {
    cart = [];
    updateCartDisplay();
}

function selectCustomer(customerId) {
    selectedCustomer = customerId || null;
}

function selectPaymentMethod(method) {
    paymentMethod = method;
    document.querySelectorAll('.payment-option').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

async function completeSale() {
    if (cart.length === 0) {
        SmartStore.showToast('Cart is empty', 'error');
        return;
    }
    
    const discountPercent = parseFloat(document.getElementById('cart-discount')?.value || 0);
    
    const saleData = {
        customerId: selectedCustomer,
        items: cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity
        })),
        discountPercent,
        paymentMethod
    };
    
    try {
        const result = await SmartStore.apiRequest('/sales', 'POST', saleData);
        SmartStore.showToast('Sale completed successfully');
        
        // Show receipt
        showReceipt(result.data);
        
        // Reset cart
        clearCart();
        loadPOS();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}

function showReceipt(sale) {
    const modalHTML = `
        <div class="modal" id="receipt-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Receipt</h3>
                    <button class="modal-close" onclick="closeReceiptModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="receipt">
                        <h4>${sale.orderNumber}</h4>
                        <p>Date: ${SmartStore.formatDateTime(sale.createdAt)}</p>
                        <hr>
                        ${sale.items.map(item => `
                            <div class="receipt-item">
                                <span>${item.productName} x ${item.quantity}</span>
                                <span>${SmartStore.formatCurrency(item.total)}</span>
                            </div>
                        `).join('')}
                        <hr>
                        <div class="receipt-total">
                            <strong>Total: ${SmartStore.formatCurrency(sale.total)}</strong>
                        </div>
                        <p>Payment: ${sale.paymentMethod}</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="window.print()">Print</button>
                    <button class="btn btn-primary" onclick="closeReceiptModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = modalHTML;
    modalContainer.style.display = 'flex';
}

function closeReceiptModal() {
    document.getElementById('modal-container').style.display = 'none';
    document.getElementById('modal-container').innerHTML = '';
}