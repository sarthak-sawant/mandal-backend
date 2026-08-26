require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'ganesh_utsav_super_secret_key_2026';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware to authenticate JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Middleware to require admin role
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(403).json({ error: 'Admin privilege required' });
  }

  const users = db.getUsers();
  const dbUser = users.find(u => u.id === req.user.id);

  if (dbUser && (dbUser.role === 'admin' || dbUser.role === 'treasurer' || (dbUser.designation && dbUser.designation.toLowerCase() === 'treasurer'))) {
    next();
  } else if (req.user.role === 'admin' || req.user.role === 'treasurer') {
    next();
  } else {
    res.status(403).json({ error: 'Admin privilege required' });
  }
}

// --- AUTHENTICATION ROUTES ---

// Register
app.post('/api/auth/register', (req, res) => {
  const { name, phone, password, designation } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Name, phone, and password are required' });
  }

  if (phone.length < 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  const existingUser = db.findUserByPhone(phone);
  if (existingUser) {
    return res.status(400).json({ error: 'Phone number already registered' });
  }

  // First user can be admin, subsequent are members
  const users = db.getUsers();
  const role = users.length === 0 ? 'admin' : 'member';
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  try {
    const newUser = db.createUser({
      name,
      phone,
      password: passwordHash,
      role,
      designation: designation || (role === 'admin' ? 'Founder' : 'Volunteer')
    });

    const token = jwt.sign({ id: newUser.id, role: newUser.role, name: newUser.name }, JWT_SECRET);
    res.status(201).json({ user: newUser, token });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone number and password are required' });
  }

  const user = db.findUserByPhone(phone);
  if (!user) {
    return res.status(401).json({ error: 'Invalid phone number or password' });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid phone number or password' });
  }

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
  const { password: _, ...safeUser } = user;

  res.json({ user: safeUser, token });
});

// Get current user profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const users = db.getUsers();
  const currentUser = users.find(u => u.id === req.user.id);
  if (!currentUser) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(currentUser);
});

// --- DASHBOARD / STATS ROUTES ---

app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  try {
    const stats = db.getDashboardStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching stats' });
  }
});

// --- COLLECTIONS ROUTES ---

// Get all collections
app.get('/api/collections', authenticateToken, (req, res) => {
  try {
    const collections = db.getCollections();
    res.json(collections);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching collections' });
  }
});

// Create collection (Admins only can post, or members can if allowed, but let's restrict or allow verified fields)
app.post('/api/collections', authenticateToken, (req, res) => {
  const { donorName, amount, type, paymentMode, notes } = req.body;

  if (!donorName || !amount || !type || !paymentMode) {
    return res.status(400).json({ error: 'Donor name, amount, type and payment mode are required' });
  }

  try {
    const newCollection = db.createCollection({
      donorName,
      amount: parseFloat(amount),
      type,
      paymentMode,
      notes: notes || '',
      collectedBy: req.user.name
    });
    res.status(201).json(newCollection);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record collection' });
  }
});

// Delete collection (Admin only)
app.delete('/api/collections/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const success = db.deleteCollection(req.params.id);
    if (success) {
      res.json({ message: 'Collection deleted successfully' });
    } else {
      res.status(404).json({ error: 'Collection not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error deleting collection' });
  }
});

// --- EXPENSES ROUTES ---

// Get all expenses
app.get('/api/expenses', authenticateToken, (req, res) => {
  try {
    const expenses = db.getExpenses();
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching expenses' });
  }
});

// Create expense
app.post('/api/expenses', authenticateToken, (req, res) => {
  const { title, amount, notes, receiptImage } = req.body;

  if (!title || !amount) {
    return res.status(400).json({ error: 'Title and amount are required' });
  }

  try {
    const newExpense = db.createExpense({
      title,
      amount: parseFloat(amount),
      notes: notes || '',
      paidBy: req.user.name,
      receiptImage: receiptImage || null // can contain base64 image or url
    });
    res.status(201).json(newExpense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add expense' });
  }
});

// Verify/Approve expense (Admin only)
app.put('/api/expenses/:id/verify', authenticateToken, requireAdmin, (req, res) => {
  try {
    const updated = db.verifyExpense(req.params.id, req.user.name);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: 'Expense not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error verifying expense' });
  }
});

// Delete expense (Admin only)
app.delete('/api/expenses/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const success = db.deleteExpense(req.params.id);
    if (success) {
      res.json({ message: 'Expense deleted successfully' });
    } else {
      res.status(404).json({ error: 'Expense not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error deleting expense' });
  }
});

// --- INVENTORY ROUTES ---

// Get inventory
app.get('/api/inventory', authenticateToken, (req, res) => {
  try {
    const inventory = db.getInventory();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching inventory' });
  }
});

// Add to inventory
app.post('/api/inventory', authenticateToken, (req, res) => {
  const { itemName, quantity, status, location } = req.body;

  if (!itemName || !quantity) {
    return res.status(400).json({ error: 'Item name and quantity are required' });
  }

  try {
    const newItem = db.createInventoryItem({
      itemName,
      quantity: parseInt(quantity),
      status: status || 'Available',
      location: location || 'Storage',
      addedBy: req.user.name
    });
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: 'Error adding inventory item' });
  }
});

// Update inventory item
app.put('/api/inventory/:id', authenticateToken, (req, res) => {
  try {
    const updated = db.updateInventoryItem(req.params.id, req.body);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error updating inventory item' });
  }
});

// Delete inventory item (Admin only)
app.delete('/api/inventory/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const success = db.deleteInventoryItem(req.params.id);
    if (success) {
      res.json({ message: 'Item deleted successfully' });
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error deleting inventory item' });
  }
});

// --- MEMBERS DIRECTORY ROUTES ---

// Get members list
app.get('/api/members', authenticateToken, (req, res) => {
  try {
    const users = db.getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching members' });
  }
});

// Update member role (Admin only)
app.put('/api/members/:id/role', authenticateToken, requireAdmin, (req, res) => {
  const { role, designation } = req.body;

  if (!role) {
    return res.status(400).json({ error: 'Role is required' });
  }

  try {
    const updated = db.updateUserRole(req.params.id, role, designation);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: 'Member not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error updating member role' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', date: new Date().toISOString() });
});

// Listen on all network interfaces so other devices on the same WiFi can access it!
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`Ganapati Mandal Backend listening on http://localhost:${PORT}`);
  console.log(`Accessible on local network via: http://<your-ip>:${PORT}`);
  console.log(`====================================================`);
});
