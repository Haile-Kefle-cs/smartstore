const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS - ሁሉንም ጥያቄዎች ይፍቀዱ
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSON parsing with error handling
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data directory
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Helper functions with error handling
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

// Email configuration with error handling
let emailTransporter = null;
try {
    emailTransporter = nodemailer.createTransport({
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
} catch (error) {
    console.error('Email transporter error:', error);
}

async function sendRealEmail(to, subject, text, html) {
    if (!emailTransporter) {
        return { success: false, error: 'Email not configured' };
    }
    
    try {
        const mailOptions = {
            from: '"SmartStore" <hulgebmereja2017@gmail.com>',
            to: to,
            subject: subject,
            text: text,
            html: html || text
        };
        
        const info = await emailTransporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email send error:', error);
        return { success: false, error: error.message };
    }
}

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
            { id: 'admin1', name: 'Admin', email: 'admin@smartstore.com', password: bcrypt.hashSync('admin123', 10), role: 'admin', active: true, createdAt: new Date().toISOString() },
            { id: 'manager1', name: 'Manager', email: 'manager@smartstore.com', password: bcrypt.hashSync('manager123', 10), role: 'manager', active: true, createdAt: new Date().toISOString() },
            { id: 'cashier1', name: 'Cashier', email: 'cashier@smartstore.com', password: bcrypt.hashSync('cashier123', 10), role: 'cashier', active: true, createdAt: new Date().toISOString() }
        ]);
    }
    
    if (readJSON('categories.json').length === 0) {
        writeJSON('categories.json', [
            { id: 'cat1', name: 'Electronics', active: true },
            { id: 'cat2', name: 'Beverages', active: true },
            { id: 'cat3', name: 'Stationery', active: true }
        ]);
    }
    
    if (readJSON('products.json').length === 0) {
        writeJSON('products.json', [
            { id: 'prod1', name: 'Laptop', sku: 'ELEC-001', barcode: '123456789012', categoryId: 'cat1', price: 55000, costPrice: 42000, quantity: 10, reorderLevel: 5, active: true },
            { id: 'prod2', name: 'Mouse', sku: 'ELEC-002', barcode: '123456789013', categoryId: 'cat1', price: 1500, costPrice: 800, quantity: 50, reorderLevel: 20, active: true },
            { id: 'prod3', name: 'Coffee', sku: 'BEV-001', barcode: '123456789014', categoryId: 'cat2', price: 350, costPrice: 180, quantity: 100, reorderLevel: 30, active: true }
        ]);
    }
    
    if (readJSON('settings.json').length === 0) {
        writeJSON('settings.json', [{
            id: 'settings1',
            storeName: 'SmartStore',
            taxRate: 15,
            currency: 'ETB',
            lowStockThreshold: 10,
            emailAddress: 'hulgebmereja2017@gmail.com'
        }]);
    }
}

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
        return res.status(401).json({ message: 'Invalid token' });
    }
};

const adminAuth = (req, res, next) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

initData();

// ============ API ROUTES ============

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============ AUTH ============
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        const users = readJSON('users.json');
        const user = users.find(u => u.email === email);
        
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        if (!user.active) {
            return res.status(401).json({ message: 'Account deactivated' });
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

app.put('/api/auth/change-password', auth, (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const users = readJSON('users.json');
        const index = users.findIndex(u => u.id === req.userId);
        
        if (index === -1) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (!bcrypt.compareSync(currentPassword, users[index].password)) {
            return res.status(400).json({ message: 'Current password incorrect' });
        }
        
        users[index].password = bcrypt.hashSync(newPassword, 10);
        writeJSON('users.json', users);
        res.json({ message: 'Password changed' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ============ EMAIL (All users) ============
app.post('/api/email/send', auth, async (req, res) => {
    try {
        const { to, subject, text, html } = req.body;
        
        if (!to || !subject || !text) {
            return res.status(400).json({ message: 'All fields required' });
        }
        
        const result = await sendRealEmail(to, subject, text, html);
        
        if (result.success) {
            const emails = readJSON('emails.json');
            emails.push({
                id: generateId('email'),
                to,
                subject,
                text,
                sentAt: new Date().toISOString(),
                sentBy: req.userId
            });
            writeJSON('emails.json', emails);
            
            res.json({ 
                success: true, 
                message: 'Email sent successfully!',
                messageId: result.messageId
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Failed to send email: ' + result.error 
            });
        }
    } catch (error) {
        console.error('Email send error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error: ' + error.message 
        });
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
        const html = `<h2>Low Stock Alert</h2><ul>${lowStock.map(p => `<li>${p.name}: ${p.quantity}</li>`).join('')}</ul>`;
        
        const result = await sendRealEmail(
            settings.emailAddress || 'hulgebmereja2017@gmail.com',
            'Low Stock Alert - SmartStore',
            text,
            html
        );
        
        res.json({ 
            success: result.success, 
            message: result.success ? 'Alert sent!' : 'Failed to send alert' 
        });
    } catch (error) {
        console.error('Low stock alert error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// ============ USERS ============
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
            return res.status(400).json({ message: 'All fields required' });
        }
        
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ message: 'Email exists' });
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
        
        await sendRealEmail(email, 'Welcome to SmartStore', `Hello ${name}, your account has been created.`);
        
        const { password: _, ...userData } = newUser;
        res.status(201).json({ message: 'User created', user: userData });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user' });
    }
});

// ============ PRODUCTS ============
app.get('/api/products', auth, (req, res) => {
    try {
        const products = readJSON('products.json');
        const categories = readJSON('categories.json');
        const withCategory = products.map(p => ({
            ...p,
            categoryName: categories.find(c => c.id === p.categoryId)?.name || 'Uncategorized',
            stockStatus: p.quantity <= 0 ? 'out-of-stock' : p.quantity <= p.reorderLevel ? 'low-stock' : 'in-stock'
        }));
        res.json({ data: withCategory });
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

// ============ SALES ============
app.get('/api/sales', auth, (req, res) => {
    try {
        const sales = readJSON('sales.json');
        const customers = readJSON('customers.json');
        const withCustomer = sales.map(s => ({
            ...s,
            customerName: customers.find(c => c.id === s.customerId)?.name || 'Walk-in'
        }));
        res.json({ data: withCustomer });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sales' });
    }
});

app.post('/api/sales', auth, async (req, res) => {
    try {
        const sales = readJSON('sales.json');
        const products = readJSON('products.json');
        const { customerId, items, paymentMethod = 'cash' } = req.body;
        
        let subtotal = 0;
        const validatedItems = items.map(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) throw new Error('Product not found');
            const total = item.quantity * product.price;
            subtotal += total;
            return { ...item, productName: product.name, total };
        });
        
        const sale = {
            id: generateId('sale'),
            orderNumber: 'SALE-' + Date.now(),
            customerId,
            items: validatedItems,
            subtotal,
            total: subtotal,
            paymentMethod,
            status: 'completed',
            createdAt: new Date().toISOString()
        };
        
        sales.push(sale);
        writeJSON('sales.json', sales);
        
        res.status(201).json(sale);
    } catch (error) {
        res.status(500).json({ message: 'Error creating sale' });
    }
});

// ============ CUSTOMERS ============
app.get('/api/customers', auth, (req, res) => {
    res.json({ data: readJSON('customers.json') });
});

app.post('/api/customers', auth, (req, res) => {
    const customers = readJSON('customers.json');
    const newCustomer = { id: generateId('cus'), ...req.body, active: true };
    customers.push(newCustomer);
    writeJSON('customers.json', customers);
    res.status(201).json(newCustomer);
});

// ============ SUPPLIERS ============
app.get('/api/suppliers', auth, (req, res) => {
    res.json({ data: readJSON('suppliers.json') });
});

app.post('/api/suppliers', auth, (req, res) => {
    const suppliers = readJSON('suppliers.json');
    const newSupplier = { id: generateId('sup'), ...req.body, active: true };
    suppliers.push(newSupplier);
    writeJSON('suppliers.json', suppliers);
    res.status(201).json(newSupplier);
});

// ============ EXPENSES ============
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

// ============ INVENTORY ============
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

// ============ REPORTS ============
app.get('/api/reports/sales', auth, (req, res) => {
    const sales = readJSON('sales.json');
    const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
    res.json({ data: { totalSales: sales.length, totalRevenue } });
});

app.get('/api/reports/inventory', auth, (req, res) => {
    const products = readJSON('products.json');
    res.json({
        data: {
            totalProducts: products.length,
            totalStockValue: products.reduce((s, p) => s + (p.quantity * p.costPrice), 0),
            lowStockCount: products.filter(p => p.quantity <= p.reorderLevel && p.quantity > 0).length
        }
    });
});

app.get('/api/reports/profit-loss', auth, (req, res) => {
    const sales = readJSON('sales.json');
    const expenses = readJSON('expenses.json');
    const revenue = sales.reduce((s, sale) => s + sale.total, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const profit = revenue - totalExpenses;
    res.json({ data: { revenue, expenses: totalExpenses, netProfit: profit } });
});

// ============ SETTINGS ============
app.get('/api/settings', auth, (req, res) => {
    res.json(readJSON('settings.json')[0] || {});
});

app.put('/api/settings', auth, (req, res) => {
    const settings = [{ ...req.body, id: 'settings1' }];
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

// ============ ERROR HANDLING ============
// 404 handler - JSON ምላሽ ይስጥ
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Route not found: ' + req.originalUrl 
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ============ START SERVER ============
app.listen(PORT, () => {
    console.log(`SmartStore running on port ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
});
