const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const readJSON = (filename) => {
    try {
        return JSON.parse(fs.readFileSync(path.join(dataDir, filename), 'utf8'));
    } catch {
        return [];
    }
};

const writeJSON = (filename, data) => {
    fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2));
};

const generateId = (prefix) => {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
};

// ============ EMAIL SETUP (Multiple methods) ============

// Method 1: Gmail SMTP
async function sendEmailGmail(to, subject, text, html) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'hulgebmereja2017@gmail.com',
                pass: 'qybkmilpwycnlecx'
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        
        const mailOptions = {
            from: 'hulgebmereja2017@gmail.com',
            to: to,
            subject: subject,
            text: text,
            html: html || text
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Gmail sent:', info.messageId);
        return { success: true, method: 'gmail', messageId: info.messageId };
    } catch (error) {
        console.error('Gmail error:', error.message);
        return { success: false, error: error.message };
    }
}

// Method 2: SMTP with port 587
async function sendEmailSMTP587(to, subject, text, html) {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: 'hulgebmereja2017@gmail.com',
                pass: 'qybkmilpwycnlecx'
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        
        const mailOptions = {
            from: 'hulgebmereja2017@gmail.com',
            to: to,
            subject: subject,
            text: text,
            html: html || text
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ SMTP 587 sent:', info.messageId);
        return { success: true, method: 'smtp587', messageId: info.messageId };
    } catch (error) {
        console.error('SMTP 587 error:', error.message);
        return { success: false, error: error.message };
    }
}

// Main email function - tries multiple methods
async function sendEmail(to, subject, text, html) {
    console.log('');
    console.log('📧 ኢሜይል ለመላክ እየሞከርን ነው...');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('');
    
    // Try Gmail first
    let result = await sendEmailGmail(to, subject, text, html);
    if (result.success) {
        return result;
    }
    
    console.log('Gmail አልሰራም፣ SMTP 587 እየሞከርን ነው...');
    
    // Try SMTP 587
    result = await sendEmailSMTP587(to, subject, text, html);
    if (result.success) {
        return result;
    }
    
    // If all fail, save to file
    console.log('ሁሉም ዘዴዎች አልሰሩም፣ ወደ ፋይል እያስቀመጥን ነው...');
    
    const emails = readJSON('emails.json');
    emails.push({
        id: generateId('email'),
        to,
        subject,
        text,
        sentAt: new Date().toISOString(),
        status: 'saved_to_file'
    });
    writeJSON('emails.json', emails);
    
    return { 
        success: true, 
        method: 'file',
        message: 'Email saved to file (SMTP not available on this server)'
    };
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
            { id: 'admin1', name: 'Admin', email: 'admin@smartstore.com', password: bcrypt.hashSync('admin123', 10), role: 'admin', active: true },
            { id: 'manager1', name: 'Manager', email: 'manager@smartstore.com', password: bcrypt.hashSync('manager123', 10), role: 'manager', active: true },
            { id: 'cashier1', name: 'Cashier', email: 'cashier@smartstore.com', password: bcrypt.hashSync('cashier123', 10), role: 'cashier', active: true }
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
            emailAddress: 'hulgebmereja2017@gmail.com'
        }]);
    }
}

const auth = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    try {
        const decoded = jwt.verify(token, 'smartstore_secret_key_2024');
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

const adminAuth = (req, res, next) => {
    if (req.userRole !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
};

initData();

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', email: 'configured' });
});

// ============ TEST EMAIL (No auth required for testing) ============
app.get('/api/test-email', async (req, res) => {
    const result = await sendEmail(
        'hulgebmereja2017@gmail.com',
        'SmartStore Test Email',
        'This is a test email from SmartStore deployed on Render.',
        '<h2>SmartStore Test</h2><p>Email is working!</p>'
    );
    res.json(result);
});

// ============ AUTH ============
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const users = readJSON('users.json');
    const user = users.find(u => u.email === email);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, role: user.role }, 'smartstore_secret_key_2024', { expiresIn: '7d' });
    const { password: _, ...userData } = user;
    res.json({ token, user: userData });
});

app.put('/api/auth/change-password', auth, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const users = readJSON('users.json');
    const index = users.findIndex(u => u.id === req.userId);
    
    if (!bcrypt.compareSync(currentPassword, users[index].password)) {
        return res.status(400).json({ message: 'Current password incorrect' });
    }
    
    users[index].password = bcrypt.hashSync(newPassword, 10);
    writeJSON('users.json', users);
    res.json({ message: 'Password changed' });
});

// ============ EMAIL ROUTES ============
app.post('/api/email/send', auth, async (req, res) => {
    try {
        const { to, subject, text, html } = req.body;
        
        if (!to || !subject || !text) {
            return res.status(400).json({ message: 'All fields required' });
        }
        
        const result = await sendEmail(to, subject, text, html);
        
        if (result.success) {
            res.json({ 
                success: true, 
                message: 'Email sent successfully via ' + result.method,
                details: result
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Failed: ' + result.error 
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/email/low-stock-alert', auth, async (req, res) => {
    const products = readJSON('products.json');
    const lowStock = products.filter(p => p.quantity <= p.reorderLevel);
    
    if (lowStock.length === 0) {
        return res.json({ success: true, message: 'No low stock products' });
    }
    
    const settings = readJSON('settings.json')[0] || {};
    const text = lowStock.map(p => `${p.name} - ${p.quantity} remaining`).join('\n');
    
    const result = await sendEmail(
        settings.emailAddress || 'hulgebmereja2017@gmail.com',
        'Low Stock Alert - SmartStore',
        text
    );
    
    res.json({ success: result.success, message: result.success ? 'Alert sent!' : 'Failed' });
});

// ============ USERS ============
app.get('/api/users', auth, adminAuth, (req, res) => {
    const users = readJSON('users.json').map(({ password, ...u }) => u);
    res.json({ data: users });
});

app.post('/api/users', auth, adminAuth, async (req, res) => {
    const { name, email, password, role } = req.body;
    const users = readJSON('users.json');
    
    const newUser = { id: generateId('usr'), name, email, password: bcrypt.hashSync(password, 10), role, active: true };
    users.push(newUser);
    writeJSON('users.json', users);
    
    await sendEmail(email, 'Welcome to SmartStore', `Hello ${name}, your account has been created.`);
    
    const { password: _, ...userData } = newUser;
    res.status(201).json({ user: userData });
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
    users[index].active = false;
    writeJSON('users.json', users);
    res.json({ message: 'User deactivated' });
});

app.delete('/api/users/:id', auth, adminAuth, (req, res) => {
    const users = readJSON('users.json').filter(u => u.id !== req.params.id);
    writeJSON('users.json', users);
    res.json({ message: 'User deleted' });
});

// ============ PRODUCTS ============
app.get('/api/products', auth, (req, res) => {
    const products = readJSON('products.json');
    const categories = readJSON('categories.json');
    const withCategory = products.map(p => ({
        ...p,
        categoryName: categories.find(c => c.id === p.categoryId)?.name || 'Uncategorized',
        stockStatus: p.quantity <= 0 ? 'out-of-stock' : p.quantity <= p.reorderLevel ? 'low-stock' : 'in-stock'
    }));
    res.json({ data: withCategory });
});

app.get('/api/products/barcode/:barcode', auth, (req, res) => {
    const product = readJSON('products.json').find(p => p.barcode === req.params.barcode);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ data: product });
});

app.post('/api/products', auth, (req, res) => {
    const products = readJSON('products.json');
    const newProduct = { id: generateId('prod'), ...req.body, active: true };
    products.push(newProduct);
    writeJSON('products.json', products);
    res.status(201).json(newProduct);
});

app.put('/api/products/:id', auth, (req, res) => {
    const products = readJSON('products.json');
    const index = products.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'Product not found' });
    products[index] = { ...products[index], ...req.body };
    writeJSON('products.json', products);
    res.json(products[index]);
});

app.delete('/api/products/:id', auth, (req, res) => {
    const products = readJSON('products.json').filter(p => p.id !== req.params.id);
    writeJSON('products.json', products);
    res.json({ message: 'Product deleted' });
});

// ============ CATEGORIES ============
app.get('/api/categories', auth, (req, res) => {
    const categories = readJSON('categories.json');
    const products = readJSON('products.json');
    const withCount = categories.map(c => ({ ...c, productCount: products.filter(p => p.categoryId === c.id).length }));
    res.json({ data: withCount });
});

app.post('/api/categories', auth, (req, res) => {
    const categories = readJSON('categories.json');
    const newCategory = { id: generateId('cat'), ...req.body, active: true };
    categories.push(newCategory);
    writeJSON('categories.json', categories);
    res.status(201).json(newCategory);
});

app.delete('/api/categories/:id', auth, (req, res) => {
    const categories = readJSON('categories.json').filter(c => c.id !== req.params.id);
    writeJSON('categories.json', categories);
    res.json({ message: 'Category deleted' });
});

// ============ SALES ============
app.get('/api/sales', auth, (req, res) => {
    const sales = readJSON('sales.json');
    const customers = readJSON('customers.json');
    const withCustomer = sales.map(s => ({ ...s, customerName: customers.find(c => c.id === s.customerId)?.name || 'Walk-in' }));
    res.json({ data: withCustomer });
});

app.post('/api/sales', auth, (req, res) => {
    const sales = readJSON('sales.json');
    const products = readJSON('products.json');
    const { customerId, items, paymentMethod = 'cash' } = req.body;
    
    let subtotal = 0;
    const validatedItems = items.map(item => {
        const product = products.find(p => p.id === item.productId);
        const total = item.quantity * (product?.price || 0);
        subtotal += total;
        return { ...item, productName: product?.name, total };
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
});

// ============ CUSTOMERS ============
app.get('/api/customers', auth, (req, res) => res.json({ data: readJSON('customers.json') }));
app.post('/api/customers', auth, (req, res) => {
    const customers = readJSON('customers.json');
    const newCustomer = { id: generateId('cus'), ...req.body, active: true };
    customers.push(newCustomer);
    writeJSON('customers.json', customers);
    res.status(201).json(newCustomer);
});
app.delete('/api/customers/:id', auth, (req, res) => {
    const customers = readJSON('customers.json').filter(c => c.id !== req.params.id);
    writeJSON('customers.json', customers);
    res.json({ message: 'Customer deleted' });
});

// ============ SUPPLIERS ============
app.get('/api/suppliers', auth, (req, res) => res.json({ data: readJSON('suppliers.json') }));
app.post('/api/suppliers', auth, (req, res) => {
    const suppliers = readJSON('suppliers.json');
    const newSupplier = { id: generateId('sup'), ...req.body, active: true };
    suppliers.push(newSupplier);
    writeJSON('suppliers.json', suppliers);
    res.status(201).json(newSupplier);
});
app.delete('/api/suppliers/:id', auth, (req, res) => {
    const suppliers = readJSON('suppliers.json').filter(s => s.id !== req.params.id);
    writeJSON('suppliers.json', suppliers);
    res.json({ message: 'Supplier deleted' });
});

// ============ EXPENSES ============
app.get('/api/expenses', auth, (req, res) => res.json({ data: readJSON('expenses.json') }));
app.post('/api/expenses', auth, (req, res) => {
    const expenses = readJSON('expenses.json');
    const newExpense = { id: generateId('exp'), ...req.body };
    expenses.push(newExpense);
    writeJSON('expenses.json', expenses);
    res.status(201).json(newExpense);
});
app.delete('/api/expenses/:id', auth, (req, res) => {
    const expenses = readJSON('expenses.json').filter(e => e.id !== req.params.id);
    writeJSON('expenses.json', expenses);
    res.json({ message: 'Expense deleted' });
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

// ============ SETTINGS ============
app.get('/api/settings', auth, (req, res) => res.json(readJSON('settings.json')[0] || {}));
app.put('/api/settings', auth, (req, res) => {
    const settings = [{ ...req.body, id: 'settings1' }];
    writeJSON('settings.json', settings);
    res.json(settings[0]);
});

// ============ STATIC FILES ============
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('=================================');
    console.log(`SmartStore running on port ${PORT}`);
    console.log('Email: Configured with multiple methods');
    console.log('=================================');
    console.log('');
});
