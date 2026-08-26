import { safeStorage as AsyncStorage } from './storage';

// Base API URL – fallback to the Render endpoint
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://bappa-mandal-backend.onrender.com/api';
// No‑op server IP configuration – API uses fixed URL
export async function setApiServerIp(_ip: string, _port = '3000'): Promise<void> {
  console.log('setApiServerIp called, but API URL is fixed; no action taken.');
}

/** Retrieve host and port derived from the base API URL */
export async function getApiServerIp(): Promise<{ ip: string; port: string }> {
  const url = new URL(API_URL);
  return { ip: url.hostname, port: url.port || (url.protocol === 'https:' ? '443' : '80') };
}
/** Build request headers, including JWT when present */
async function getHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = await AsyncStorage.getItem('mandal_auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/** Debug wrapper around fetch – logs request/response */
async function debugFetch(url: string, options: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, options);
    console.log('DEBUG FETCH →', url, options?.method, response.status);
    const body = await response.clone().text();
    console.log('Response body →', body);
    return response;
  } catch (err) {
    console.error('debugFetch error →', err);
    throw err;
  }
}

/** Generic response handler – returns parsed JSON or null on error */
async function handleResponse<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('content-type');
  let data: any;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { error: await response.text() };
  }
  if (!response.ok) {
    console.warn('API request failed →', response.status, data.error);
    return null;
  }
  return data as T;
}

// ---------- Type definitions ----------
interface AuthResult {
  user: any;
  token: string;
}
interface DashboardStats {
  totalCollections: number;
  totalExpenses: number;
  balance: number;
  pendingVerification: number;
  memberCount: number;
  collectionsByType: Record<string, number>;
  expensesByCategory: Record<string, number>;
  collectionTarget: number;
}
interface Collection {
  id: number;
  donorName: string;
  amount: number;
  type: string;
  paymentMode: string;
  notes?: string;
}
interface Expense {
  id: number;
  title: string;
  amount: number;
  notes?: string;
  receiptImage?: string | null;
}
interface InventoryItem {
  id: number;
  itemName: string;
  quantity: number;
  status: string;
  location: string;
}
interface Member {
  id: number;
  name: string;
  role: string;
  designation?: string;
}

export const api = {
  // Config
  getUrl: () => API_URL,

  // Auth
  async login(phone: string, password: string): Promise<AuthResult | null> {
    const headers = await getHeaders();
    const response = await debugFetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone, password }),
    });
    const result = await handleResponse<AuthResult>(response);
    if (result) {
      await AsyncStorage.setItem('mandal_auth_token', result.token);
      await AsyncStorage.setItem('mandal_user_profile', JSON.stringify(result.user));
    }
    return result;
  },

  async register(name: string, phone: string, password: string, designation?: string): Promise<AuthResult | null> {
    const headers = await getHeaders();
    const response = await debugFetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, phone, password, designation }),
    });
    const result = await handleResponse<AuthResult>(response);
    if (result) {
      await AsyncStorage.setItem('mandal_auth_token', result.token);
      await AsyncStorage.setItem('mandal_user_profile', JSON.stringify(result.user));
    }
    return result;
  },

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('mandal_auth_token');
    await AsyncStorage.removeItem('mandal_user_profile');
  },

  async getProfile(): Promise<any | null> {
    const headers = await getHeaders();
    const response = await debugFetch(`${API_URL}/auth/me`, { method: 'GET', headers });
    return handleResponse<any>(response);
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats | null> {
    const headers = await getHeaders();
    const response = await debugFetch(`${API_URL}/dashboard/stats`, { method: 'GET', headers });
    return handleResponse<DashboardStats>(response);
  },

  // Collections
  async getCollections(): Promise<Collection[] | null> {
    const headers = await getHeaders();
    const response = await debugFetch(`${API_URL}/collections`, { method: 'GET', headers });
    return handleResponse<Collection[]>(response);
  },

  async createCollection(data: Omit<Collection, 'id'>): Promise<Collection | null> {
    const headers = await getHeaders();
    const response = await debugFetch(`${API_URL}/collections`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<Collection>(response);
  },

  async deleteCollection(id: number): Promise<any | null> {
    const headers = await getHeaders();
    const response = await debugFetch(`${API_URL}/collections/${id}`, { method: 'DELETE', headers });
    return handleResponse<any>(response);
  },

  // Expenses
  async getExpenses(): Promise<Expense[] | null> {
    const headers = await getHeaders();
    const response = await debugFetch(`${API_URL}/expenses`, { method: 'GET', headers });
    return handleResponse<Expense[]>(response);
  },

  async createExpense(data: Omit<Expense, 'id'>): Promise<Expense | null> {
    const headers = await getHeaders();
    const response = await debugFetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<Expense>(response);
  },

  async verifyExpense(id: number): Promise<any | null> {
    const headers = await getHeaders();
    const response = await debugFetch(`${API_URL}/expenses/${id}/verify`, { method: 'PUT', headers });
    return handleResponse<any>(response);
  },

  async deleteExpense(id: number): Promise<any | null> {
    const headers = await getHeaders();
    const response = await debugFetch(`${API_URL}/expenses/${id}`, { method: 'DELETE', headers });
    return handleResponse<any>(response);
  },

  // Inventory
  async getInventory(): Promise<InventoryItem[] | null> {
    const headers = await getHeaders();
    const response = await debugFetch(`${API_URL}/inventory`, { method: 'GET', headers });
    return handleResponse<InventoryItem[]>(response);
  },

  async createInventoryItem(data: Omit<InventoryItem, 'id'>): Promise<InventoryItem | null> {
    const headers = await getHeaders();
    const response = await debugFetch(`${API_URL}/inventory`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<InventoryItem>(response);
  },

  async updateInventoryItem(id: number, updates: Partial<InventoryItem>): Promise<any | null> {
    const headers = await getHeaders();
    const response = await debugFetch(`${API_URL}/inventory/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    return handleResponse<any>(response);
  },

  async deleteInventoryItem(id: number): Promise<any | null> {
    const headers = await getHeaders();
    const response = await debugFetch(`${API_URL}/inventory/${id}`, { method: 'DELETE', headers });
    return handleResponse<any>(response);
  },

  // Members
  async getMembers(): Promise<Member[] | null> {
    const headers = await getHeaders();
    const response = await debugFetch(`${API_URL}/members`, { method: 'GET', headers });
    return handleResponse<Member[]>(response);
  },

  async updateMemberRole(userId: number, role: string, designation?: string): Promise<any | null> {
    const headers = await getHeaders();
    const response = await debugFetch(`${API_URL}/members/${userId}/role`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ role, designation }),
    });
    return handleResponse<any>(response);
  },
};
