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
async function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(403).json({ error: 'Admin privilege required' });
  }

  const users = await db.getUsers();
  const dbUser = users.find(u => u.id === req.user.id);

  if (dbUser && (dbUser.role === 'admin' || dbUser.role === 'treasurer' || (dbUser.designation && dbUser.designation.toLowerCase() === 'treasurer'))) {
    return next();
  }
  if (req.user.role === 'admin' || req.user.role === 'treasurer') {
    return next();
  }
  return res.status(403).json({ error: 'Admin privilege required' });
}

// --- AUTHENTICATION ROUTES ---

// Register
app.post('/api/auth/register', async (req, res) => {
  const { name, phone, password, designation } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Name, phone, and password are required' });
  }

  if (phone.length < 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  try {
    const existingUser = await db.findUserByPhone(phone);
    if (existingUser) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    const allUsers = await db.getUsers();
    const role = allUsers.length === 0 ? 'admin' : 'member';
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUser = await db.createUser({
      name,
      phone,
      password: passwordHash,
      role,
      designation: designation || (role === 'admin' ? 'Founder' : 'Volunteer')
    });

    const token = jwt.sign({ id: newUser.id, role: newUser.role, name: newUser.name }, JWT_SECRET);
    res.status(201).json({ user: newUser, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone number and password are required' });
  }

  try {
    const user = await db.findUserByPhone(phone);
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const users = await db.getUsers();
    const currentUser = users.find(u => u.id === req.user.id);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(currentUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// --- DASHBOARD / STATS ROUTES ---

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await db.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching stats' });
  }
});

// --- COLLECTIONS ROUTES ---

// Get all collections
app.get('/api/collections', authenticateToken, async (req, res) => {
  try {
    const collections = await db.getCollections();
    res.json(collections);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching collections' });
  }
});

// Create collection (Admins only can post, or members can if allowed, but let's restrict or allow verified fields)
app.post('/api/collections', authenticateToken, async (req, res) => {
  const { donorName, amount, type, paymentMode, notes } = req.body;

  if (!donorName || !amount || !type || !paymentMode) {
    return res.status(400).json({ error: 'Donor name, amount, type and payment mode are required' });
  }

  try {
    const newCollection = await db.createCollection({
      donorName,
      amount: parseFloat(amount),
      type,
      paymentMode,
      notes: notes || '',
      collectedBy: req.user.name
    });
    res.status(201).json(newCollection);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to record collection' });
  }
});

// Delete collection (Admin only)
app.delete('/api/collections/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const success = await db.deleteCollection(req.params.id);
    if (success) {
      return res.json({ message: 'Collection deleted successfully' });
    }
    return res.status(404).json({ error: 'Collection not found' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error deleting collection' });
  }
});

// --- EXPENSES ROUTES ---

// Get all expenses
app.get('/api/expenses', authenticateToken, async (req, res) => {
  try {
    const expenses = await db.getExpenses();
    res.json(expenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching expenses' });
  }
});

// Create expense route (adjusted for async)
app.post('/api/expenses', authenticateToken, async (req, res) => {
  const { amount, category, description, title, notes, receiptImage } = req.body;
  if (!amount || !title) {
    return res.status(400).json({ error: 'Amount and title are required' });
  }
  try {
    const newExpense = await db.createExpense({ 
        title,
        amount: parseFloat(amount), 
        category: category || 'General', 
        description: description || '',
        notes: notes || '',
        paidBy: req.user.name,
        receiptImage: receiptImage || null
    });
    res.status(201).json(newExpense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to record expense' });
  }
});

// Verify expense route (async)
app.patch('/api/expenses/:id/verify', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updated = await db.verifyExpense(req.params.id, req.user.name);
    if (updated) {
        res.json(updated);
    } else {
        res.status(404).json({ error: 'Expense not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify expense' });
  }
});

// Delete expense (Admin only)
app.delete('/api/expenses/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const success = await db.deleteExpense(req.params.id);
    if (success) {
      return res.json({ message: 'Expense deleted successfully' });
    }
    return res.status(404).json({ error: 'Expense not found' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error deleting expense' });
  }
});

// --- INVENTORY ROUTES ---

// Get inventory
app.get('/api/inventory', authenticateToken, async (req, res) => {
  try {
    const inventory = await db.getInventory();
    res.json(inventory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching inventory' });
  }
});

// Add to inventory
app.post('/api/inventory', authenticateToken, async (req, res) => {
  const { itemName, quantity, status, location } = req.body;

  if (!itemName || !quantity) {
    return res.status(400).json({ error: 'Item name and quantity are required' });
  }

  try {
    const newItem = await db.createInventoryItem({
      itemName,
      quantity: parseInt(quantity),
      status: status || 'Available',
      location: location || 'Storage',
      addedBy: req.user.name
    });
    res.status(201).json(newItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error adding inventory item' });
  }
});

// Update inventory item
app.put('/api/inventory/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await db.updateInventoryItem(req.params.id, req.body);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating inventory item' });
  }
});

// Delete inventory item (Admin only)
app.delete('/api/inventory/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const success = await db.deleteInventoryItem(req.params.id);
    if (success) {
      return res.json({ message: 'Item deleted successfully' });
    }
    return res.status(404).json({ error: 'Item not found' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error deleting inventory item' });
  }
});

// --- MEMBERS DIRECTORY ROUTES ---

// Get members list
app.get('/api/members', authenticateToken, async (req, res) => {
  try {
    const users = await db.getUsers();
    res.json(users);
  } catch (error) {
    console.error(error);
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
