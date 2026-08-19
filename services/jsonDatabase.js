const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');

class JSONDatabase {
  constructor() {
    this.cache = {};
    this.initialized = false;
    this.writeQueue = Promise.resolve();
  }

  async initialize() {
    if (this.initialized) return;
    
    const files = [
      'users', 'products', 'categories', 'suppliers', 'customers',
      'sales', 'purchases', 'expenses', 'payments', 'returns',
      'stock-movements', 'notifications', 'settings'
    ];

    // Ensure data directory exists
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (err) {
      console.error('Error creating data directory:', err);
    }

    // Initialize all data files
    for (const file of files) {
      const filePath = path.join(DATA_DIR, `${file}.json`);
      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, JSON.stringify([], null, 2));
      }
    }

    // Seed data if empty
    await this.seedData();
    this.initialized = true;
    console.log('Database initialized successfully');
  }

  async readTable(tableName) {
    // Check cache first
    if (this.cache[tableName]) {
      return JSON.parse(JSON.stringify(this.cache[tableName])); // Return deep copy
    }
    
    const filePath = path.join(DATA_DIR, `${tableName}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data);
      this.cache[tableName] = parsed;
      return JSON.parse(JSON.stringify(parsed)); // Return deep copy
    } catch (error) {
      console.error(`Error reading ${tableName}:`, error);
      return [];
    }
  }

  async writeTable(tableName, data) {
    // Queue writes to prevent race conditions
    this.writeQueue = this.writeQueue.then(async () => {
      const filePath = path.join(DATA_DIR, `${tableName}.json`);
      try {
        const jsonData = JSON.stringify(data, null, 2);
        await fs.writeFile(filePath, jsonData);
        this.cache[tableName] = JSON.parse(JSON.stringify(data)); // Store deep copy
      } catch (error) {
        console.error(`Error writing ${tableName}:`, error);
        throw error;
      }
    });
    
    await this.writeQueue;
  }

  async find(tableName, query = {}) {
    const table = await this.readTable(tableName);
    return table.filter(item => {
      return Object.keys(query).every(key => {
        if (Array.isArray(query[key])) {
          return query[key].includes(item[key]);
        }
        if (typeof query[key] === 'object' && query[key] !== null) {
          // Handle operators like $gt, $lt, etc.
          return this.matchOperators(item[key], query[key]);
        }
        return item[key] === query[key];
      });
    });
  }

  matchOperators(value, operators) {
    return Object.keys(operators).every(op => {
      switch (op) {
        case '$gt': return value > operators[op];
        case '$gte': return value >= operators[op];
        case '$lt': return value < operators[op];
        case '$lte': return value <= operators[op];
        case '$ne': return value !== operators[op];
        case '$in': return operators[op].includes(value);
        case '$nin': return !operators[op].includes(value);
        case '$regex': return new RegExp(operators[op], 'i').test(value);
        case '$contains': return String(value).toLowerCase().includes(String(operators[op]).toLowerCase());
        default: return true;
      }
    });
  }

  async findOne(tableName, query = {}) {
    const results = await this.find(tableName, query);
    return results[0] || null;
  }

  async findById(tableName, id) {
    return this.findOne(tableName, { id });
  }

  async create(tableName, data) {
    const table = await this.readTable(tableName);
    const newRecord = {
      id: uuidv4(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    table.push(newRecord);
    await this.writeTable(tableName, table);
    return newRecord;
  }

  async createMany(tableName, dataArray) {
    const table = await this.readTable(tableName);
    const newRecords = dataArray.map(data => ({
      id: uuidv4(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    table.push(...newRecords);
    await this.writeTable(tableName, table);
    return newRecords;
  }

  async update(tableName, id, data) {
    const table = await this.readTable(tableName);
    const index = table.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    table[index] = {
      ...table[index],
      ...data,
      id: table[index].id, // Preserve original ID
      createdAt: table[index].createdAt, // Preserve creation date
      updatedAt: new Date().toISOString()
    };
    await this.writeTable(tableName, table);
    return table[index];
  }

  async updateMany(tableName, query, data) {
    const table = await this.readTable(tableName);
    let updatedCount = 0;
    
    table.forEach((item, index) => {
      const matches = Object.keys(query).every(key => item[key] === query[key]);
      if (matches) {
        table[index] = {
          ...item,
          ...data,
          id: item.id,
          createdAt: item.createdAt,
          updatedAt: new Date().toISOString()
        };
        updatedCount++;
      }
    });
    
    if (updatedCount > 0) {
      await this.writeTable(tableName, table);
    }
    
    return updatedCount;
  }

  async delete(tableName, id) {
    const table = await this.readTable(tableName);
    const filtered = table.filter(item => item.id !== id);
    await this.writeTable(tableName, filtered);
    return true;
  }

  async deleteMany(tableName, query = {}) {
    const table = await this.readTable(tableName);
    const filtered = table.filter(item => {
      return !Object.keys(query).every(key => item[key] === query[key]);
    });
    const deletedCount = table.length - filtered.length;
    await this.writeTable(tableName, filtered);
    return deletedCount;
  }

  async count(tableName, query = {}) {
    const results = await this.find(tableName, query);
    return results.length;
  }

  async clearTable(tableName) {
    await this.writeTable(tableName, []);
  }

  async seedData() {
    try {
      // Seed users if empty
      const users = await this.readTable('users');
      if (users.length === 0) {
        const defaultUsers = [
          {
            id: uuidv4(),
            name: 'Admin User',
            email: 'admin@smartstore.com',
            password: await bcrypt.hash('admin123', 10),
            role: 'admin',
            phone: '+1 (555) 123-4567',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: uuidv4(),
            name: 'Manager User',
            email: 'manager@smartstore.com',
            password: await bcrypt.hash('manager123', 10),
            role: 'manager',
            phone: '+1 (555) 234-5678',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: uuidv4(),
            name: 'Cashier User',
            email: 'cashier@smartstore.com',
            password: await bcrypt.hash('cashier123', 10),
            role: 'cashier',
            phone: '+1 (555) 345-6789',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        await this.writeTable('users', defaultUsers);
        console.log('Default users created');
      }

      // Seed categories if empty
      const categories = await this.readTable('categories');
      if (categories.length === 0) {
        const defaultCategories = [
          {
            id: uuidv4(),
            name: 'Electronics',
            description: 'Electronic devices and accessories',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: uuidv4(),
            name: 'Beverages',
            description: 'Drinks and beverages',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: uuidv4(),
            name: 'Stationery',
            description: 'Office and school supplies',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: uuidv4(),
            name: 'Groceries',
            description: 'Food and household items',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: uuidv4(),
            name: 'Clothing',
            description: 'Apparel and accessories',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        await this.writeTable('categories', defaultCategories);
        console.log('Default categories created');
      }

      // Seed settings if empty
      const settings = await this.readTable('settings');
      if (settings.length === 0) {
        const defaultSettings = {
          id: uuidv4(),
          storeName: 'SmartStore',
          storeTagline: 'Your One-Stop Shop',
          address: '123 Main Street',
          city: 'Springfield',
          state: 'IL',
          zipCode: '62701',
          country: 'USA',
          phone: '+1 (555) 123-4567',
          email: 'info@smartstore.com',
          website: 'www.smartstore.com',
          currency: 'USD',
          currencySymbol: '$',
          taxRate: 10,
          taxEnabled: true,
          lowStockThreshold: 10,
          receiptFooter: 'Thank you for shopping with SmartStore!',
          receiptHeader: 'SmartStore - Your One-Stop Shop',
          timezone: 'America/Chicago',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          enableNotifications: true,
          enableEmailNotifications: true,
          emailNotificationAddress: 'admin@smartstore.com',
          enableSMSNotifications: false,
          smsNotificationNumber: '',
          enableAutoBackup: true,
          backupInterval: 'daily',
          lastBackupDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await this.writeTable('settings', [defaultSettings]);
        console.log('Default settings created');
      }
    } catch (error) {
      console.error('Error seeding data:', error);
    }
  }

  // Transaction support
  async transaction(callback) {
    // Simple transaction implementation
    try {
      // Start transaction
      const snapshot = {};
      const tables = ['users', 'products', 'categories', 'suppliers', 'customers',
                      'sales', 'purchases', 'expenses', 'payments', 'returns',
                      'stock-movements', 'notifications', 'settings'];
      
      for (const table of tables) {
        snapshot[table] = await this.readTable(table);
      }
      
      // Execute callback
      const result = await callback(this);
      
      // Commit transaction (no-op since we've already written)
      return result;
    } catch (error) {
      // Rollback transaction
      console.error('Transaction failed:', error);
      throw error;
    }
  }

  // Backup and restore
  async backup() {
    const tables = ['users', 'products', 'categories', 'suppliers', 'customers',
                    'sales', 'purchases', 'expenses', 'payments', 'returns',
                    'stock-movements', 'notifications', 'settings'];
    
    const backup = {};
    for (const table of tables) {
      backup[table] = await this.readTable(table);
    }
    
    const backupPath = path.join(DATA_DIR, 'backup');
    await fs.mkdir(backupPath, { recursive: true });
    await fs.writeFile(
      path.join(backupPath, `backup-${Date.now()}.json`),
      JSON.stringify(backup, null, 2)
    );
    
    return backup;
  }

  async restore(backupData) {
    for (const [table, data] of Object.entries(backupData)) {
      await this.writeTable(table, data);
    }
  }
}

const db = new JSONDatabase();

module.exports = { 
  db, 
  initializeDatabase: () => db.initialize() 
};