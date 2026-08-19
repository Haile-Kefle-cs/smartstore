const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS - Allow all origins for Render
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSON parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data directory - works on Render
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Helper functions
const readJSON = (filename) => {
    try {
        const filePath = path.join(dataDir, filename);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '[]');
            return [];
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        return [];
    }
};

const writeJSON = (filename, data) => {
    try {
        fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filename}:`, error);
        return false;
    }
};

const generateId = (prefix) => {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
};

const generateBarcode = () => {
    let barcode = '';
    for (let i = 0; i < 12; i++) barcode += Math.floor(Math.random() * 10);
    return barcode;
};

// Email configuration (for localhost only - Render uses FormSubmit)
let emailTransporter = null;
try {
    emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'hulgebmereja2017@gmail.com',
            pass: 'qybkmilpwycnlecx'
        },
        tls: { rejectUnauthorized: false }
    });
} catch (error) {
    console.log('Email transporter not configured (will use FormSubmit on frontend)');
}

async function sendEmail(to, subject, text, html) {
    if (!emailTransporter) {
        return { success: false, error: 'Email not configured on server. Use FormSubmit.co on frontend.' };
    }
    
    try {
        const mailOptions = {
            from: '"SmartStore" <hulgebmereja2017@gmail.com>',
            to, subject, text,
            html: html || text
        };
        const info = await emailTransporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email error:', error.message);
        return { success: false, error: error.message };
    }
}

// Initialize data
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
    
    if (readJSON('users.json').length === 0) {
        writeJSON('users.json', [
            { id: 'admin1', name: 'Admin User', email: 'admin@smartstore.com', password: bcrypt.hashSync('admin123', 10), role: 'admin', active: true, createdAt: new Date().toISOString() },
            { id: 'manager1', name: 'Manager User', email: 'manager@smartstore.com', password: bcrypt.hashSync('manager123', 10), role: 'manager', active: true, createdAt: new Date().toISOString() },
            { id: 'cashier1', name: 'Cashier User', email: 'cashier@smartstore.com', password: bcrypt.hashSync('cashier123', 10), role: 'cashier', active: true, createdAt: new Date().toISOString() }
        ]);
        console.log('✓ Default users created');
    }
    
    if (readJSON('categories.json').length === 0) {
        writeJSON('categories.json', [
            { id: 'cat1', name: 'Electronics', nameEn: 'ኤሌክትሮኒክስ', description: 'Electronic devices', active: true, createdAt: new Date().toISOString() },
            { id: 'cat2', name: 'Beverages', nameEn: 'መጠጦች', description: 'Drinks', active: true, createdAt: new Date().toISOString() },
            { id: 'cat3', name: 'Stationery', nameEn: 'ጽህፈት', description: 'Office supplies', active: true, createdAt: new Date().toISOString() }
        ]);
        console.log('✓ Default categories created');
    }
    
    if (readJSON('products.json').length === 0) {
        writeJSON('products.json', [
            { id: 'prod1', name: 'Laptop', nameEn: 'ላፕቶፕ', sku: 'ELEC-001', barcode: '123456789012', categoryId: 'cat1', price: 55000, costPrice: 42000, quantity: 10, reorderLevel: 5, active: true, createdAt: new Date().toISOString() },
            { id: 'prod2', name: 'Mouse', nameEn: 'መዳፊት', sku: 'ELEC-002', barcode: '123456789013', categoryId: 'cat1', price: 1500, costPrice: 800, quantity: 50, reorderLevel: 20, active: true, createdAt: new Date().toISOString() },
            { id: 'prod3', name: 'Coffee', nameEn: 'ቡና', sku: 'BEV-001', barcode: '123456789014', categoryId: 'cat2', price: 350, costPrice: 180, quantity: 100, reorderLevel: 30, active: true, createdAt: new Date().toISOString() },
            { id: 'prod4', name: 'Notebook', nameEn: 'ደብተር', sku: 'STAT-001', barcode: '123456789015', categoryId: 'cat3', price: 120, costPrice: 50, quantity: 200, reorderLevel: 50, active: true, createdAt: new Date().toISOString() }
        ]);
        console.log('✓ Sample products created');
    }
    
    if (readJSON('settings.json').length === 0) {
        writeJSON('settings.json', [{
            id: 'settings1',
            storeName: 'SmartStore',
            storeNameEn: 'ስማርት ስቶር',
            taxRate: 15,
            currency: 'ETB',
            currencySymbol: 'ብር',
            lowStockThreshold: 10,
            emailNotifications: true,
            emailAddress: 'hulgebmereja2017@gmail.com',
            receiptFooter: 'Thank you!',
            receiptFooterEn: 'እናመሰግናለን!',
            createdAt: new Date().toISOString()
        }]);
        console.log('✓ Default settings created');
    }
    
    console.log('✓ Database initialized');
}

// Auth middleware
const auth = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smartstore_secret_key_2024');
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

const adminAuth = (req, res, next) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

initData();

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        email: emailTransporter ? 'configured' : 'use-frontend-formsubmit'
    });
});

// ============ AUTH ROUTES ============
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        const users = readJSON('users.json');
        const user = users.find(u => u.email === email);
        
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        
        if (!user.active) {
            return res.status(401).json({ message: 'Account is deactivated' });
        }
        
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET || 'smartstore_secret_key_2024', 
            { expiresIn: '7d' }
        );
        
        const { password: _, ...userData } = user;
        res.json({ token, user: userData });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/api/auth/me', auth, (req, res) => {
    try {
        const users = readJSON('users.json');
        const user = users.find(u => u.id === req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const { password: _, ...userData } = user;
        res.json({ user: userData });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.put('/api/auth/change-password', auth, (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const users = readJSON('users.json');
        const index = users.findIndex(u => u.id === req.userId);
        
        if (index === -1) return res.status(404).json({ message: 'User not found' });
        
        if (!bcrypt.compareSync(currentPassword, users[index].password)) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        
        users[index].password = bcrypt.hashSync(newPassword, 10);
        writeJSON('users.json', users);
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ============ EMAIL ROUTES (Server-side attempt, frontend uses FormSubmit) ============
app.post('/api/email/send', auth, async (req, res) => {
    try {
        const { to, subject, text, html } = req.body;
        if (!to || !subject || !text) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        
        const result = await sendEmail(to, subject, text, html);
        
        if (result.success) {
            const emails = readJSON('emails.json');
            emails.push({ id: generateId('email'), to, subject, text, sentAt: new Date().toISOString(), sentBy: req.userId });
            writeJSON('emails.json', emails);
            res.json({ success: true, message: 'Email sent successfully!' });
        } else {
            // Return error but suggest frontend fallback
            res.status(500).json({ 
                success: false, 
                message: result.error,
                suggestion: 'Use FormSubmit.co on frontend for Render deployment'
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/email/low-stock-alert', auth, async (req, res) => {
    try {
        const products = readJSON('products.json');
        const lowStock = products.filter(p => p.quantity <= p.reorderLevel);
        
        if (lowStock.length === 0) {
            return res.json({ success: true, message: 'No low stock products' });
        }
        
        const settings = readJSON('settings.json')[0] || {};
        const text = lowStock.map(p => `${p.name} - ${p.quantity} remaining`).join('\n');
        
        const result = await sendEmail(settings.emailAddress || 'hulgebmereja2017@gmail.com', 'Low Stock Alert - SmartStore', text);
        
        res.json({ success: result.success, message: result.success ? 'Alert sent!' : 'Failed: ' + result.error });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ USER MANAGEMENT ============
app.get('/api/users', auth, adminAuth, (req, res) => {
    try {
        const users = readJSON('users.json').map(({ password, ...u }) => u);
        res.json({ data: users });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
});

app.post('/api/users', auth, adminAuth, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const users = readJSON('users.json');
        
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        
        if (!['admin', 'manager', 'cashier'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }
        
        const newUser = {
            id: generateId('usr'),
            name,
            email,
            password: bcrypt.hashSync(password, 10),
            role,
            active: true,
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        writeJSON('users.json', users);
        
        await sendEmail(email, 'Welcome to SmartStore', `Hello ${name}, your account has been created.`);
        
        const { password: _, ...userData } = newUser;
        res.status(201).json({ message: 'User created successfully', user: userData });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user' });
    }
});

app.put('/api/users/:id/activate', auth, adminAuth, (req, res) => {
    const users = readJSON('users.json');
    const index = users.findIndex(u => u.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'User not found' });
    users[index].active = true;
    writeJSON('users.json', users);
    res.json({ message: 'User activated' });
});

app.put('/api/users/:id/deactivate', auth, adminAuth, (req, res) => {
    const users = readJSON('users.json');
    const index = users.findIndex(u => u.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'User not found' });
    if (users[index].id === req.userId) return res.status(400).json({ message: 'Cannot deactivate yourself' });
    users[index].active = false;
    writeJSON('users.json', users);
    res.json({ message: 'User deactivated' });
});

app.delete('/api/users/:id', auth, adminAuth, (req, res) => {
    const users = readJSON('users.json').filter(u => u.id !== req.params.id);
    writeJSON('users.json', users);
    res.json({ message: 'User deleted' });
});

// ============ PRODUCT ROUTES ============
app.get('/api/products', auth, (req, res) => {
    try {
        const products = readJSON('products.json');
        const categories = readJSON('categories.json');
        const productsWithCategory = products.map(p => ({
            ...p,
            categoryName: categories.find(c => c.id === p.categoryId)?.name || 'Uncategorized',
            stockStatus: p.quantity <= 0 ? 'out-of-stock' : p.quantity <= p.reorderLevel ? 'low-stock' : 'in-stock'
        }));
        res.json({ data: productsWithCategory });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products' });
    }
});

app.get('/api/products/barcode/:barcode', auth, (req, res) => {
    try {
        const product = readJSON('products.json').find(p => p.barcode === req.params.barcode);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json({ data: product });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching product' });
    }
});

app.post('/api/products', auth, (req, res) => {
    try {
        const products = readJSON('products.json');
        const newProduct = {
            id: generateId('prod'),
            ...req.body,
            barcode: req.body.barcode || generateBarcode(),
            active: true,
            createdAt: new Date().toISOString()
        };
        products.push(newProduct);
        writeJSON('products.json', products);
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ message: 'Error creating product' });
    }
});

app.put('/api/products/:id', auth, (req, res) => {
    try {
        const products = readJSON('products.json');
        const index = products.findIndex(p => p.id === req.params.id);
        if (index === -1) return res.status(404).json({ message: 'Product not found' });
        products[index] = { ...products[index], ...req.body };
        writeJSON('products.json', products);
        res.json(products[index]);
    } catch (error) {
        res.status(500).json({ message: 'Error updating product' });
    }
});

app.delete('/api/products/:id', auth, (req, res) => {
    try {
        const products = readJSON('products.json').filter(p => p.id !== req.params.id);
        writeJSON('products.json', products);
        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting product' });
    }
});

// ============ CATEGORY ROUTES ============
app.get('/api/categories', auth, (req, res) => {
    try {
        const categories = readJSON('categories.json');
        const products = readJSON('products.json');
        const categoriesWithCount = categories.map(c => ({
            ...c,
            productCount: products.filter(p => p.categoryId === c.id).length
        }));
        res.json({ data: categoriesWithCount });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching categories' });
    }
});

app.post('/api/categories', auth, (req, res) => {
    try {
        const categories = readJSON('categories.json');
        const newCategory = { id: generateId('cat'), ...req.body, active: true, createdAt: new Date().toISOString() };
        categories.push(newCategory);
        writeJSON('categories.json', categories);
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ message: 'Error creating category' });
    }
});

app.delete('/api/categories/:id', auth, (req, res) => {
    try {
        const categories = readJSON('categories.json').filter(c => c.id !== req.params.id);
        writeJSON('categories.json', categories);
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting category' });
    }
});

// ============ SALES ROUTES ============
app.get('/api/sales', auth, (req, res) => {
    try {
        const sales = readJSON('sales.json');
        const customers = readJSON('customers.json');
        const salesWithCustomer = sales.map(s => ({
            ...s,
            customerName: customers.find(c => c.id === s.customerId)?.name || 'Walk-in Customer'
        }));
        res.json({ data: salesWithCustomer });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sales' });
    }
});

app.post('/api/sales', auth, (req, res) => {
    try {
        const sales = readJSON('sales.json');
        const products = readJSON('products.json');
        const { customerId, items, discountPercent = 0, paymentMethod = 'cash' } = req.body;
        
        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'Items are required' });
        }
        
        let subtotal = 0;
        const validatedItems = items.map(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) throw new Error('Product not found');
            const total = item.quantity * product.price;
            subtotal += total;
            return { ...item, productName: product.name, price: product.price, total };
        });
        
        const tax = subtotal * 0.15;
        const discount = subtotal * (discountPercent / 100);
        const total = subtotal + tax - discount;
        
        const sale = {
            id: generateId('sale'),
            orderNumber: 'SALE-' + Date.now(),
            customerId,
            items: validatedItems,
            subtotal,
            tax,
            discount,
            total,
            paymentMethod,
            status: 'completed',
            createdBy: req.userId,
            createdAt: new Date().toISOString()
        };
        
        sales.push(sale);
        writeJSON('sales.json', sales);
        
        validatedItems.forEach(item => {
            const index = products.findIndex(p => p.id === item.productId);
            if (index !== -1) products[index].quantity -= item.quantity;
        });
        writeJSON('products.json', products);
        
        res.status(201).json(sale);
    } catch (error) {
        res.status(500).json({ message: 'Error creating sale' });
    }
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
    res.json({ message: 'Customer deleted' });
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
    res.json({ message: 'Supplier deleted' });
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
    res.json({ message: 'Expense deleted' });
});

// ============ INVENTORY ROUTES ============
app.get('/api/inventory', auth, (req, res) => {
    const products = readJSON('products.json');
    res.json({
        data: {
            totalProducts: products.length,
            totalQuantity: products.reduce((s, p) => s + p.quantity, 0),
            totalValue: products.reduce((s, p) => s + (p.quantity * p.costPrice), 0),
            lowStock: products.filter(p => p.quantity <= p.reorderLevel && p.quantity > 0).length,
            outOfStock: products.filter(p => p.quantity <= 0).length,
            lowStockProducts: products.filter(p => p.quantity <= p.reorderLevel && p.quantity > 0)
        }
    });
});

// ============ REPORT ROUTES ============
app.get('/api/reports/sales', auth, (req, res) => {
    const sales = readJSON('sales.json');
    const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
    res.json({ data: { totalSales: sales.length, totalRevenue, averageSale: sales.length ? totalRevenue / sales.length : 0 } });
});

app.get('/api/reports/inventory', auth, (req, res) => {
    const products = readJSON('products.json');
    res.json({
        data: {
            totalProducts: products.length,
            totalStockValue: products.reduce((s, p) => s + (p.quantity * p.costPrice), 0),
            lowStockCount: products.filter(p => p.quantity <= p.reorderLevel && p.quantity > 0).length,
            outOfStockCount: products.filter(p => p.quantity <= 0).length
        }
    });
});

app.get('/api/reports/profit-loss', auth, (req, res) => {
    const sales = readJSON('sales.json');
    const expenses = readJSON('expenses.json');
    const revenue = sales.reduce((s, sale) => s + sale.total, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const profit = revenue - totalExpenses;
    res.json({ data: { revenue, expenses: totalExpenses, netProfit: profit, profitMargin: revenue ? (profit / revenue) * 100 : 0 } });
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

// ============ STATIC FILES & PAGES ============
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found: ' + req.originalUrl });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('=================================');
    console.log('   SmartStore Server');
    console.log('=================================');
    console.log(`   Port: ${PORT}`);
    console.log(`   URL: http://localhost:${PORT}`);
    console.log('');
    console.log('   Login:');
    console.log('   Admin: admin@smartstore.com / admin123');
    console.log('   Manager: manager@smartstore.com / manager123');
    console.log('   Cashier: cashier@smartstore.com / cashier123');
    console.log('');
    console.log('   Email: Use FormSubmit.co on frontend');
    console.log('   (Render does not support Gmail SMTP)');
    console.log('=================================');
});
