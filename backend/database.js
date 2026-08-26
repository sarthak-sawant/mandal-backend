require('dotenv').config();
const supabase = require('./supabase');

// ---------- Users ----------
async function getUsers() {
  const { data, error } = await supabase.from('users').select('id, name, phone, role, designation, joined_at');
  if (error) throw error;
  return data;
}

async function findUserByPhone(phone) {
  const { data, error } = await supabase.from('users').select('*').eq('phone', phone).single();
  if (error && error.code !== 'PGRST116') throw error; // not found is okay
  return data;
}

async function createUser(user) {
  const { data, error } = await supabase.from('users').insert(user).select('id, name, phone, role, designation, joined_at').single();
  if (error) throw error;
  return data;
}

// ---------- Collections ----------
async function getCollections() {
  const { data, error } = await supabase.from('collections').select('*').order('date', { ascending: false });
  if (error) throw error;
  return data;
}

async function createCollection(col) {
  // Generate receipt number: RCP-YYYYMMDD-XXXX
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randPart = String(Math.floor(1000 + Math.random() * 9000));
  const receipt_no = `RCP-${datePart}-${randPart}`;

  // Map camelCase keys to snake_case Supabase columns
  const payload = {
    receipt_no,
    donor_name:   col.donorName,
    amount:       col.amount,
    type:         col.type,
    payment_mode: col.paymentMode,
    notes:        col.notes || '',
    collected_by: col.collectedBy || '',
    date:         now.toISOString(),
  };
  const { data, error } = await supabase.from('collections').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

async function deleteCollection(id) {
  const { error } = await supabase.from('collections').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ---------- Expenses ----------
async function getExpenses() {
  const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
  if (error) throw error;
  return data;
}

async function createExpense(exp) {
  // Map camelCase keys to snake_case Supabase columns
  const payload = {
    title:         exp.title,
    amount:        exp.amount,
    category:      exp.category || 'General',
    description:   exp.description || '',
    notes:         exp.notes || '',
    receipt_image: exp.receiptImage || null,
    date:          new Date().toISOString(),
    paid_by:       exp.paidBy || '',
    verified:      true,
  };
  const { data, error } = await supabase.from('expenses').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

async function verifyExpense(id, adminName) {
  const { data, error } = await supabase.from('expenses').update({ verified: true, verified_by: adminName }).eq('id', id).single();
  if (error) throw error;
  return data;
}

async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ---------- Inventory ----------
async function getInventory() {
  const { data, error } = await supabase.from('inventory').select('*');
  if (error) throw error;
  return data;
}

// Create inventory item
async function createInventoryItem(item) {
  // Map camelCase keys to snake_case Supabase columns
  const payload = {
    item_name: item.itemName,
    quantity:  item.quantity,
    status:    item.status || 'Available',
    location:  item.location || 'Storage',
  };
  const { data, error } = await supabase.from('inventory').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

// Update inventory item
async function updateInventoryItem(id, updates) {
  const { data, error } = await supabase.from('inventory').update(updates).eq('id', id).single();
  if (error) throw error;
  return data;
}

// Delete inventory item
async function deleteInventoryItem(id) {
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ---------- Dashboard Stats ----------
async function getDashboardStats() {
  const [{ data: collections }, { data: expenses }, { data: users }] = await Promise.all([
    supabase.from('collections').select('amount,type'),
    supabase.from('expenses').select('amount,verified'),
    supabase.from('users').select('id')
  ]);

  const totalCollections = collections.reduce((s, c) => s + Number(c.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalCollections - totalExpenses;
  const pendingVerification = expenses.filter(e => !e.verified).length;

  const collectionsByType = collections.reduce((obj, c) => {
    obj[c.type] = (obj[c.type] || 0) + Number(c.amount);
    return obj;
  }, {});

  return {
    totalCollections,
    totalExpenses,
    balance,
    pendingVerification,
    memberCount: users.length,
    collectionsByType,
    expensesByCategory: {},
    collectionTarget: 50000
  };
}

module.exports = {
  // Users
  getUsers,
  findUserByPhone,
  createUser,
  // Collections
  getCollections,
  createCollection,
  deleteCollection,
  // Expenses
  getExpenses,
  createExpense,
  verifyExpense,
  deleteExpense,
  // Inventory
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  // Dashboard
  getDashboardStats
};
