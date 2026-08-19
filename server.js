const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data directory
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Helper functions
const readJSON = (filename) => {
    try {
        return JSON.parse(fs.readFileSync(path.join(dataDir, filename), 'utf8'));
    } catch {
        return [];
    }
};

const writeJSON = (filename, data) => {
    try {
        fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing file:', error);
        return false;
    }
};

const generateId = (prefix) => {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
};

const generateBarcode = () => {
    let barcode = '';
    for (let i = 0; i < 12; i++) {
        barcode += Math.floor(Math.random() * 10);
    }
    return barcode;
};

// ============ EMAIL CONFIGURATION ============
const emailTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'hulgebmereja2017@gmail.com',
        pass: 'qybkmilpwycnlecx'
    },
    tls: {
        rejectUnauthorized: false
    }
});

async function sendRealEmail(to, subject, text, html) {
    try {
        const mailOptions = {
            from: '"ስማርት ስቶር SmartStore" <hulgebmereja2017@gmail.com>',
            to: to,
            subject: subject,
            text: text,
            html: html || text
        };
        
        const info = await emailTransporter.sendMail(mailOptions);
        console.log('✅ ኢሜይል ተልኳል:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ ኢሜይል መላክ አልተሳካም:', error.message);
        return { success: false, error: error.message };
    }
}

// ============ DATA INITIALIZATION ============
function initData() {
    const files = ['users', 'products', 'categories', 'suppliers', 'customers',
                   'sales', 'purchases', 'expenses', 'payments', 'returns',
                   'stock-movements', 'notifications', 'settings', 'emails'];
    
    files.forEach(file => {
        const filePath = path.join(dataDir, `${file}.json`);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify([], null, 2));
        }
    });
    
    // Seed users
    if (readJSON('users.json').length === 0) {
        writeJSON('users.json', [
            { id: 'admin1', name: 'አስተዳዳሪ', nameEn: 'Admin User', email: 'admin@smartstore.com', password: bcrypt.hashSync('admin123', 10), role: 'admin', active: true, createdAt: new Date().toISOString() },
            { id: 'manager1', name: 'ሥራ አስኪያጅ', nameEn: 'Manager User', email: 'manager@smartstore.com', password: bcrypt.hashSync('manager123', 10), role: 'manager', active: true, createdAt: new Date().toISOString() },
            { id: 'cashier1', name: 'ሒሳብ ባለሙያ', nameEn: 'Cashier User', email: 'cashier@smartstore.com', password: bcrypt.hashSync('cashier123', 10), role: 'cashier', active: true, createdAt: new Date().toISOString() }
        ]);
        console.log('✓ ነባሪ ተጠቃሚዎች ተፈጥረዋል');
    }
    
    // Seed categories
    if (readJSON('categories.json').length === 0) {
        writeJSON('categories.json', [
            { id: 'cat1', name: 'ኤሌክትሮኒክስ', nameEn: 'Electronics', description: 'የኤሌክትሮኒክስ መሳሪያዎች', active: true, createdAt: new Date().toISOString() },
            { id: 'cat2', name: 'መጠጦች', nameEn: 'Beverages', description: 'መጠጦች', active: true, createdAt: new Date().toISOString() },
            { id: 'cat3', name: 'ጽህፈት መሳሪያዎች', nameEn: 'Stationery', description: 'የቢሮ እቃዎች', active: true, createdAt: new Date().toISOString() }
        ]);
        console.log('✓ ነባሪ ምድቦች ተፈጥረዋል');
    }
    
    // Seed products with ETB prices
    if (readJSON('products.json').length === 0) {
        writeJSON('products.json', [
            { id: 'prod1', name: 'ላፕቶፕ', nameEn: 'Laptop', sku: 'ELEC-001', barcode: '123456789012', categoryId: 'cat1', price: 55000, costPrice: 42000, quantity: 10, reorderLevel: 5, active: true, createdAt: new Date().toISOString() },
            { id: 'prod2', name: 'መዳፊት', nameEn: 'Mouse', sku: 'ELEC-002', barcode: '123456789013', categoryId: 'cat1', price: 1500, costPrice: 800, quantity: 50, reorderLevel: 20, active: true, createdAt: new Date().toISOString() },
            { id: 'prod3', name: 'ቡና', nameEn: 'Coffee', sku: 'BEV-001', barcode: '123456789014', categoryId: 'cat2', price: 350, costPrice: 180, quantity: 100, reorderLevel: 30, active: true, createdAt: new Date().toISOString() },
            { id: 'prod4', name: 'ደብተር', nameEn: 'Notebook', sku: 'STAT-001', barcode: '123456789015', categoryId: 'cat3', price: 120, costPrice: 50, quantity: 200, reorderLevel: 50, active: true, createdAt: new Date().toISOString() }
        ]);
        console.log('✓ ናሙና ምርቶች ተፈጥረዋል');
    }
    
    // Seed settings
    if (readJSON('settings.json').length === 0) {
        writeJSON('settings.json', [{
            id: 'settings1',
            storeName: 'ስማርት ስቶር',
            storeNameEn: 'SmartStore',
            taxRate: 15,
            currency: 'ETB',
            currencySymbol: 'ብር',
            lowStockThreshold: 10,
            emailNotifications: true,
            emailAddress: 'hulgebmereja2017@gmail.com',
            receiptFooter: 'እናመሰግናለን!',
            receiptFooterEn: 'Thank you!',
            createdAt: new Date().toISOString()
        }]);
        console.log('✓ ነባሪ ቅንብሮች ተፈጥረዋል');
    }
    
    console.log('✓ ዳታቤዝ ተጀምሯል');
}

// ============ MIDDLEWARE ============
const auth = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'ማረጋገጫ ያስፈልጋል / Authentication required' });
    }
    try {
        const decoded = jwt.verify(token, 'smartstore_secret_key_2024');
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'ልክ ያልሆነ ማረጋገጫ / Invalid token' });
    }
};

const adminAuth = (req, res, next) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'የአስተዳዳሪ ፍቃድ ያስፈልጋል / Admin access required' });
    }
    next();
};

// ============ INITIALIZE ============
initData();

// ============ AUTH ROUTES ============
// Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const users = readJSON('users.json');
    const user = users.find(u => u.email === email);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ message: 'ኢሜይል ወይም የይለፍ ቃል ትክክል አይደለም / Invalid credentials' });
    }
    
    if (!user.active) {
        return res.status(401).json({ message: 'መለያዎ ቦዝኗል / Account deactivated' });
    }
    
    const token = jwt.sign({ id: user.id, role: user.role }, 'smartstore_secret_key_2024', { expiresIn: '7d' });
    const { password: _, ...userData } = user;
    res.json({ token, user: userData });
});

// Get current user
app.get('/api/auth/me', auth, (req, res) => {
    const users = readJSON('users.json');
    const user = users.find(u => u.id === req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { password: _, ...userData } = user;
    res.json({ user: userData });
});

// Change password (any authenticated user)
app.put('/api/auth/change-password', auth, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const users = readJSON('users.json');
    const userIndex = users.findIndex(u => u.id === req.userId);
    
    if (userIndex === -1) return res.status(404).json({ message: 'User not found' });
    
    if (!bcrypt.compareSync(currentPassword, users[userIndex].password)) {
        return res.status(400).json({ message: 'የአሁኑ የይለፍ ቃል ትክክል አይደለም / Current password incorrect' });
    }
    
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'የይለፍ ቃል ቢያንስ 6 ቁምፊዎች / Password must be 6+ characters' });
    }
    
    users[userIndex].password = bcrypt.hashSync(newPassword, 10);
    writeJSON('users.json', users);
    res.json({ message: 'የይለፍ ቃል ተቀይሯል / Password changed' });
});

// ============ EMAIL ROUTES (All users can send) ============
// Send email (any authenticated user)
app.post('/api/email/send', auth, async (req, res) => {
    const { to, subject, text, html } = req.body;
    
    if (!to || !subject || !text) {
        return res.status(400).json({ message: 'ሁሉም መስኮች ያስፈልጋሉ / All fields required' });
    }
    
    const result = await sendRealEmail(to, subject, text, html);
    
    if (result.success) {
        const emails = readJSON('emails.json');
        emails.push({ id: generateId('email'), to, subject, text, sentAt: new Date().toISOString(), messageId: result.messageId, sentBy: req.userId });
        writeJSON('emails.json', emails);
        res.json({ success: true, message: 'ኢሜይል በተሳካ ሁኔታ ተልኳል! / Email sent!' });
    } else {
        res.status(500).json({ success: false, message: 'ኢሜይል መላክ አልተሳካም: ' + result.error });
    }
});

// Low stock alert (any authenticated user)
app.post('/api/email/low-stock-alert', auth, async (req, res) => {
    const products = readJSON('products.json');
    const lowStockProducts = products.filter(p => p.quantity <= p.reorderLevel);
    
    if (lowStockProducts.length === 0) {
        return res.json({ message: 'ዝቅተኛ ክምችት ያላቸው ምርቶች የሉም / No low stock products' });
    }
    
    const settings = readJSON('settings.json')[0];
    const emailText = lowStockProducts.map(p => `${p.name} - ${p.quantity} ቀርቷል (ማዘዣ: ${p.reorderLevel})`).join('\n');
    const emailHtml = `<h2>⚠️ ዝቅተኛ ክምችት ማስጠንቀቂያ / Low Stock Alert</h2><ul>${lowStockProducts.map(p => `<li><strong>${p.name}</strong>: ${p.quantity} ቀርቷል</li>`).join('')}</ul>`;
    
    const result = await sendRealEmail(settings.emailAddress || 'hulgebmereja2017@gmail.com', '⚠️ ስማርት ስቶር - ዝቅተኛ ክምችት', emailText, emailHtml);
    
    res.json({ success: result.success, message: result.success ? 'ማስጠንቀቂያ ተልኳል! / Alert sent!' : 'ማስጠንቀቂያ መላክ አልተሳካም / Failed' });
});

// Sale receipt (any authenticated user)
app.post('/api/email/sale-receipt', auth, async (req, res) => {
    const { saleId, customerEmail } = req.body;
    const sales = readJSON('sales.json');
    const sale = sales.find(s => s.id === saleId);
    
    if (!sale) return res.status(404).json({ message: 'ሽያጭ አልተገኘም / Sale not found' });
    if (!customerEmail) return res.status(400).json({ message: 'የደንበኛ ኢሜይል ያስፈልጋል / Customer email required' });
    
    const itemsHtml = sale.items.map(item => `<tr><td>${item.productName}</td><td>${item.quantity}</td><td>ብር ${item.total.toLocaleString()}</td></tr>`).join('');
    const emailHtml = `<h2>ስማርት ስቶር ደረሰኝ / Receipt</h2><p>ትዕዛዝ: ${sale.orderNumber}</p><table border="1" cellpadding="10">${itemsHtml}</table><p><strong>ጠቅላላ: ብር ${sale.total.toLocaleString()}</strong></p><p>እናመሰግናለን! / Thank you!</p>`;
    
    const result = await sendRealEmail(customerEmail, `ደረሰኝ - ${sale.orderNumber}`, `Total: ብር ${sale.total.toLocaleString()}`, emailHtml);
    
    res.json({ success: result.success, message: result.success ? 'ደረሰኝ ተልኳል! / Receipt sent!' : 'ደረሰኝ መላክ አልተሳካም / Failed' });
});

// ============ USER MANAGEMENT (Admin only) ============
// Get all users
app.get('/api/users', auth, adminAuth, (req, res) => {
    const users = readJSON('users.json');
    const usersWithoutPassword = users.map(({ password, ...user }) => user);
    res.json({ data: usersWithoutPassword });
});

// Add user
app.post('/api/users', auth, adminAuth, async (req, res) => {
    const { name, email, password, role } = req.body;
    const users = readJSON('users.json');
    
    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'ሁሉም መስኮች ያስፈልጋሉ / All fields required' });
    }
    
    const existingUser = users.find(u => u.email === email);
    if (existingUser) return res.status(400).json({ message: 'ኢሜይሉ አስቀድሞ ተመዝግቧል / Email exists' });
    
    const newUser = { id: generateId('usr'), name, email, password: bcrypt.hashSync(password, 10), role, active: true, createdAt: new Date().toISOString() };
    users.push(newUser);
    writeJSON('users.json', users);
    
    // Send welcome email
    await sendRealEmail(email, 'እንኳን ወደ ስማርት ስቶር መጡ / Welcome', `ሰላም ${name},\n\nመለያዎ ተፈጥሯል።\nኢሜይል: ${email}\nሚና: ${role}`);
    
    const { password: _, ...userData } = newUser;
    res.status(201).json({ message: 'ተጠቃሚ ተፈጥሯል / User created', user: userData });
});

// Activate user
app.put('/api/users/:id/activate', auth, adminAuth, (req, res) => {
    const users = readJSON('users.json');
    const index = users.findIndex(u => u.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'ተጠቃሚ አልተገኘም / User not found' });
    users[index].active = true;
    writeJSON('users.json', users);
    res.json({ message: 'ተጠቃሚ ነቅቷል / User activated' });
});

// Deactivate user
app.put('/api/users/:id/deactivate', auth, adminAuth, (req, res) => {
    const users = readJSON('users.json');
    const index = users.findIndex(u => u.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'ተጠቃሚ አልተገኘም / User not found' });
    if (users[index].id === req.userId) return res.status(400).json({ message: 'ራስዎን ማቦዘን አይችሉም / Cannot deactivate yourself' });
    users[index].active = false;
    writeJSON('users.json', users);
    res.json({ message: 'ተጠቃሚ ቦዝኗል / User deactivated' });
});

// Delete user
app.delete('/api/users/:id', auth, adminAuth, (req, res) => {
    const users = readJSON('users.json').filter(u => u.id !== req.params.id);
    writeJSON('users.json', users);
    res.json({ message: 'ተጠቃሚ ተሰርዟል / User deleted' });
});

// ============ PRODUCT ROUTES ============
// Get all products
app.get('/api/products', auth, (req, res) => {
    const products = readJSON('products.json');
    const categories = readJSON('categories.json');
    const productsWithCategory = products.map(product => {
        const category = categories.find(c => c.id === product.categoryId);
        return {
            ...product,
            categoryName: category?.name || 'ያልተመደበ',
            stockStatus: product.quantity <= 0 ? 'out-of-stock' : product.quantity <= product.reorderLevel ? 'low-stock' : 'in-stock'
        };
    });
    res.json({ data: productsWithCategory });
});

// Get product by barcode
app.get('/api/products/barcode/:barcode', auth, (req, res) => {
    const products = readJSON('products.json');
    const product = products.find(p => p.barcode === req.params.barcode);
    if (!product) return res.status(404).json({ message: 'ምርት አልተገኘም / Product not found' });
    res.json({ data: product });
});

// Add product
app.post('/api/products', auth, (req, res) => {
    const products = readJSON('products.json');
    const newProduct = { id: generateId('prod'), ...req.body, barcode: req.body.barcode || generateBarcode(), active: true, createdAt: new Date().toISOString() };
    products.push(newProduct);
    writeJSON('products.json', products);
    res.status(201).json(newProduct);
});

// Update product
app.put('/api/products/:id', auth, (req, res) => {
    const products = readJSON('products.json');
    const index = products.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'ምርት አልተገኘም / Product not found' });
    products[index] = { ...products[index], ...req.body };
    writeJSON('products.json', products);
    res.json(products[index]);
});

// Delete product
app.delete('/api/products/:id', auth, (req, res) => {
    const products = readJSON('products.json').filter(p => p.id !== req.params.id);
    writeJSON('products.json', products);
    res.json({ message: 'ምርት ተሰርዟል / Product deleted' });
});

// ============ CATEGORY ROUTES ============
app.get('/api/categories', auth, (req, res) => {
    const categories = readJSON('categories.json');
    const products = readJSON('products.json');
    const categoriesWithCount = categories.map(category => ({
        ...category,
        productCount: products.filter(p => p.categoryId === category.id).length
    }));
    res.json({ data: categoriesWithCount });
});

app.post('/api/categories', auth, (req, res) => {
    const categories = readJSON('categories.json');
    const newCategory = { id: generateId('cat'), ...req.body, active: true, createdAt: new Date().toISOString() };
    categories.push(newCategory);
    writeJSON('categories.json', categories);
    res.status(201).json(newCategory);
});

app.delete('/api/categories/:id', auth, (req, res) => {
    const categories = readJSON('categories.json').filter(c => c.id !== req.params.id);
    writeJSON('categories.json', categories);
    res.json({ message: 'ምድብ ተሰርዟል / Category deleted' });
});

// ============ SALES ROUTES ============
app.get('/api/sales', auth, (req, res) => {
    const sales = readJSON('sales.json');
    const customers = readJSON('customers.json');
    const salesWithCustomer = sales.map(sale => ({
        ...sale,
        customerName: customers.find(c => c.id === sale.customerId)?.name || 'Walk-in'
    }));
    res.json({ data: salesWithCustomer });
});

app.post('/api/sales', auth, async (req, res) => {
    const sales = readJSON('sales.json');
    const products = readJSON('products.json');
    const { customerId, items, discountPercent = 0, paymentMethod = 'cash', customerEmail } = req.body;
    
    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'ምርቶች ያስፈልጋሉ / Items required' });
    }
    
    let subtotal = 0;
    const validatedItems = items.map(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) throw new Error('ምርት አልተገኘም / Product not found');
        const total = item.quantity * product.price;
        subtotal += total;
        return { ...item, productName: product.name, price: product.price, total };
    });
    
    const tax = subtotal * 0.15; // 15% VAT
    const discount = subtotal * (discountPercent / 100);
    const total = subtotal + tax - discount;
    
    const sale = { id: generateId('sale'), orderNumber: 'SALE-' + Date.now(), customerId, items: validatedItems, subtotal, tax, discount, total, paymentMethod, status: 'completed', createdBy: req.userId, createdAt: new Date().toISOString() };
    sales.push(sale);
    writeJSON('sales.json', sales);
    
    // Update stock
    validatedItems.forEach(item => {
        const index = products.findIndex(p => p.id === item.productId);
        if (index !== -1) products[index].quantity -= item.quantity;
    });
    writeJSON('products.json', products);
    
    // Send receipt email if provided
    if (customerEmail) {
        await sendRealEmail(customerEmail, `ደረሰኝ - ${sale.orderNumber}`, `Total: ብር ${total.toLocaleString()}`, `<h2>ደረሰኝ</h2><p>Total: ብር ${total.toLocaleString()}</p>`);
    }
    
    res.status(201).json(sale);
});

// ============ CUSTOMER ROUTES ============
app.get('/api/customers', auth, (req, res) => {
    res.json({ data: readJSON('customers.json') });
});

app.post('/api/customers', auth, (req, res) => {
    const customers = readJSON('customers.json');
    const newCustomer = { id: generateId('cus'), ...req.body, active: true, createdAt: new Date().toISOString() };
    customers.push(newCustomer);
    writeJSON('customers.json', customers);
    res.status(201).json(newCustomer);
});

app.delete('/api/customers/:id', auth, (req, res) => {
    const customers = readJSON('customers.json').filter(c => c.id !== req.params.id);
    writeJSON('customers.json', customers);
    res.json({ message: 'ደንበኛ ተሰርዟል / Customer deleted' });
});

// ============ SUPPLIER ROUTES ============
app.get('/api/suppliers', auth, (req, res) => {
    res.json({ data: readJSON('suppliers.json') });
});

app.post('/api/suppliers', auth, (req, res) => {
    const suppliers = readJSON('suppliers.json');
    const newSupplier = { id: generateId('sup'), ...req.body, active: true, createdAt: new Date().toISOString() };
    suppliers.push(newSupplier);
    writeJSON('suppliers.json', suppliers);
    res.status(201).json(newSupplier);
});

app.delete('/api/suppliers/:id', auth, (req, res) => {
    const suppliers = readJSON('suppliers.json').filter(s => s.id !== req.params.id);
    writeJSON('suppliers.json', suppliers);
    res.json({ message: 'አቅራቢ ተሰርዟል / Supplier deleted' });
});

// ============ EXPENSE ROUTES ============
app.get('/api/expenses', auth, (req, res) => {
    res.json({ data: readJSON('expenses.json') });
});

app.post('/api/expenses', auth, (req, res) => {
    const expenses = readJSON('expenses.json');
    const newExpense = { id: generateId('exp'), ...req.body, createdAt: new Date().toISOString() };
    expenses.push(newExpense);
    writeJSON('expenses.json', expenses);
    res.status(201).json(newExpense);
});

app.delete('/api/expenses/:id', auth, (req, res) => {
    const expenses = readJSON('expenses.json').filter(e => e.id !== req.params.id);
    writeJSON('expenses.json', expenses);
    res.json({ message: 'ወጪ ተሰርዟል / Expense deleted' });
});

// ============ INVENTORY ROUTES ============
app.get('/api/inventory', auth, (req, res) => {
    const products = readJSON('products.json');
    res.json({ data: {
        totalProducts: products.length,
        totalQuantity: products.reduce((s, p) => s + p.quantity, 0),
        totalValue: products.reduce((s, p) => s + (p.quantity * p.costPrice), 0),
        lowStock: products.filter(p => p.quantity <= p.reorderLevel && p.quantity > 0).length,
        outOfStock: products.filter(p => p.quantity <= 0).length,
        lowStockProducts: products.filter(p => p.quantity <= p.reorderLevel && p.quantity > 0)
    }});
});

// ============ REPORT ROUTES ============
app.get('/api/reports/sales', auth, (req, res) => {
    const sales = readJSON('sales.json');
    const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
    res.json({ data: { totalSales: sales.length, totalRevenue, averageSale: sales.length > 0 ? totalRevenue / sales.length : 0 } });
});

app.get('/api/reports/inventory', auth, (req, res) => {
    const products = readJSON('products.json');
    res.json({ data: {
        totalProducts: products.length,
        totalStockValue: products.reduce((s, p) => s + (p.quantity * p.costPrice), 0),
        lowStockCount: products.filter(p => p.quantity <= p.reorderLevel && p.quantity > 0).length,
        outOfStockCount: products.filter(p => p.quantity <= 0).length
    }});
});

app.get('/api/reports/profit-loss', auth, (req, res) => {
    const sales = readJSON('sales.json');
    const expenses = readJSON('expenses.json');
    const revenue = sales.reduce((s, sale) => s + sale.total, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const grossProfit = revenue - totalExpenses;
    res.json({ data: { revenue, expenses: totalExpenses, grossProfit, netProfit: grossProfit, profitMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0 } });
});

// ============ SETTINGS ROUTES ============
app.get('/api/settings', auth, (req, res) => {
    res.json(readJSON('settings.json')[0] || {});
});

app.put('/api/settings', auth, (req, res) => {
    const settings = [{ ...req.body, id: 'settings1', updatedAt: new Date().toISOString() }];
    writeJSON('settings.json', settings);
    res.json(settings[0]);
});

// ============ PAGE ROUTES ============
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'ገጽ አልተገኘም / Page not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ message: 'የውስጥ ስህተት / Internal error' });
});

// ============ START SERVER ============
app.listen(PORT, () => {
    console.log('');
    console.log('=================================');
    console.log('   ስማርት ስቶር ሰርቨር ተጀምሯል');
    console.log('   SmartStore Server Started');
    console.log('=================================');
    console.log(`   አድራሻ / URL: http://localhost:${PORT}`);
    console.log('');
    console.log('   መግቢያ / Login:');
    console.log('   አስተዳዳሪ / Admin: admin@smartstore.com / admin123');
    console.log('   ሥራ አስኪያጅ / Manager: manager@smartstore.com / manager123');
    console.log('   ሒሳብ ባለሙያ / Cashier: cashier@smartstore.com / cashier123');
    console.log('');
    console.log('   ባህሪያት / Features:');
    console.log('   ✓ ኢሜይል - ለሁሉም ተጠቃሚዎች');
    console.log('   ✓ ባርኮድ ስካነር');
    console.log('   ✓ ገንዘብ - ኢትዮጵያ ብር (ETB)');
    console.log('   ✓ ሁለት ቋንቋ - አማርኛ/English');
    console.log('   ✓ የተጠቃሚ አስተዳደር');
    console.log('=================================');
});