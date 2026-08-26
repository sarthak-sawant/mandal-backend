require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'db.json');

// Initialize database with seed data if it doesn't exist
function initDB() {
  if (fs.existsSync(DB_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      // Basic check
      if (data.users && data.expenses && data.collections) {
        return data;
      }
    } catch (e) {
      console.error('Error reading db.json, re-initializing...', e);
    }
  }

  const initialData = {
    users: [],
    collections: [],
    expenses: [],
    inventory: []
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf8');
  return initialData;
}

// Helper to read database
function readData() {
  return initDB();
}

// Helper to write database
function writeData(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// DB actions
const db = {
  // Users
  getUsers: () => {
    const data = readData();
    return data.users.map(({ password, ...u }) => u);
  },
  findUserByPhone: (phone) => {
    const data = readData();
    return data.users.find(u => u.phone === phone);
  },
  createUser: (user) => {
    const data = readData();
    const newUser = {
      id: data.users.length ? Math.max(...data.users.map(u => u.id)) + 1 : 1,
      ...user,
      joinedAt: new Date().toISOString()
    };
    data.users.push(newUser);
    writeData(data);
    const { password, ...safeUser } = newUser;
    return safeUser;
  },
  updateUserRole: (userId, role, designation) => {
    const data = readData();
    const userIndex = data.users.findIndex(u => u.id === parseInt(userId));
    if (userIndex === -1) return null;
    
    data.users[userIndex].role = role;
    if (designation) data.users[userIndex].designation = designation;
    writeData(data);
    const { password, ...safeUser } = data.users[userIndex];
    return safeUser;
  },

  // Collections
  getCollections: () => {
    const data = readData();
    return data.collections.sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  createCollection: (col) => {
    const data = readData();
    const nextId = data.collections.length ? Math.max(...data.collections.map(c => c.id)) + 1 : 1;
    const newCol = {
      id: nextId,
      receiptNo: `REC-2026-${String(nextId).padStart(3, '0')}`,
      date: new Date().toISOString(),
      ...col
    };
    data.collections.push(newCol);
    writeData(data);
    return newCol;
  },
  deleteCollection: (id) => {
    const data = readData();
    const initialLen = data.collections.length;
    data.collections = data.collections.filter(c => c.id !== parseInt(id));
    writeData(data);
    return data.collections.length < initialLen;
  },

  // Expenses
  getExpenses: () => {
    const data = readData();
    return data.expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  createExpense: (exp) => {
    const data = readData();
    const newExp = {
      id: data.expenses.length ? Math.max(...data.expenses.map(e => e.id)) + 1 : 1,
      date: new Date().toISOString(),
      verified: false,
      ...exp
    };
    data.expenses.push(newExp);
    writeData(data);
    return newExp;
  },
  verifyExpense: (id, adminName) => {
    const data = readData();
    const expIndex = data.expenses.findIndex(e => e.id === parseInt(id));
    if (expIndex === -1) return null;
    
    data.expenses[expIndex].verified = true;
    data.expenses[expIndex].verifiedBy = adminName;
    writeData(data);
    return data.expenses[expIndex];
  },
  deleteExpense: (id) => {
    const data = readData();
    const initialLen = data.expenses.length;
    data.expenses = data.expenses.filter(e => e.id !== parseInt(id));
    writeData(data);
    return data.expenses.length < initialLen;
  },

  // Inventory
  getInventory: () => {
    const data = readData();
    return data.inventory;
  },
  createInventoryItem: (item) => {
    const data = readData();
    const newItem = {
      id: data.inventory.length ? Math.max(...data.inventory.map(i => i.id)) + 1 : 1,
      ...item
    };
    data.inventory.push(newItem);
    writeData(data);
    return newItem;
  },
  updateInventoryItem: (id, updates) => {
    const data = readData();
    const itemIndex = data.inventory.findIndex(i => i.id === parseInt(id));
    if (itemIndex === -1) return null;
    
    data.inventory[itemIndex] = {
      ...data.inventory[itemIndex],
      ...updates
    };
    writeData(data);
    return data.inventory[itemIndex];
  },
  deleteInventoryItem: (id) => {
    const data = readData();
    const initialLen = data.inventory.length;
    data.inventory = data.inventory.filter(i => i.id !== parseInt(id));
    writeData(data);
    return data.inventory.length < initialLen;
  },

  // Stats / Dashboard calculations
  getDashboardStats: () => {
    const data = readData();
    const totalCollections = data.collections.reduce((sum, c) => sum + c.amount, 0);
    const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);
    const balance = totalCollections - totalExpenses;
    
    // Group collections by type
    const collectionsByType = {};
    data.collections.forEach(c => {
      collectionsByType[c.type] = (collectionsByType[c.type] || 0) + c.amount;
    });

    // Unverified expenses count
    const pendingVerification = data.expenses.filter(e => !e.verified).length;

    return {
      totalCollections,
      totalExpenses,
      balance,
      pendingVerification,
      memberCount: data.users.length,
      collectionsByType,
      expensesByCategory: {},
      collectionTarget: 50000 // default target
    };
  }
};

module.exports = db;

// Force initialize database file immediately on module import
initDB();
