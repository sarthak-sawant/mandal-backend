import { safeStorage as AsyncStorage } from './storage';

const DEFAULT_API_HOST = process.env.EXPO_PUBLIC_DEFAULT_API_HOST || '10.0.2.2'; 
const DEFAULT_API_PORT = process.env.EXPO_PUBLIC_DEFAULT_API_PORT || '3000';

let API_URL = `http://${DEFAULT_API_HOST}:${DEFAULT_API_PORT}/api`;

export async function setApiServerIp(ip: string, port = '3000') {
  const formattedIp = ip.trim();
  const baseUrl = `http://${formattedIp}:${port}/api`;
  API_URL = baseUrl;
  await AsyncStorage.setItem('mandal_api_ip', formattedIp);
  await AsyncStorage.setItem('mandal_api_port', port);
  console.log('API Base URL updated to:', API_URL);
}

export async function getApiServerIp(): Promise<{ ip: string; port: string }> {
  const ip = await AsyncStorage.getItem('mandal_api_ip') || DEFAULT_API_HOST;
  const port = await AsyncStorage.getItem('mandal_api_port') || DEFAULT_API_PORT;
  API_URL = `http://${ip}:${port}/api`;
  return { ip, port };
}

// Automatically load custom IP on startup
getApiServerIp().catch(err => console.error('Failed to load API IP', err));

async function getHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = await AsyncStorage.getItem('mandal_auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { error: await response.text() };
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Config
  getUrl: () => API_URL,

  // Auth
  async login(phone: string, password: string) {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone, password }),
    });
    const result = await handleResponse<{ user: any; token: string }>(response);
    await AsyncStorage.setItem('mandal_auth_token', result.token);
    await AsyncStorage.setItem('mandal_user_profile', JSON.stringify(result.user));
    return result;
  },

  async register(name: string, phone: string, password: string, designation?: string) {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, phone, password, designation }),
    });
    const result = await handleResponse<{ user: any; token: string }>(response);
    await AsyncStorage.setItem('mandal_auth_token', result.token);
    await AsyncStorage.setItem('mandal_user_profile', JSON.stringify(result.user));
    return result;
  },

  async logout() {
    await AsyncStorage.removeItem('mandal_auth_token');
    await AsyncStorage.removeItem('mandal_user_profile');
  },

  async getProfile() {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers,
    });
    return handleResponse<any>(response);
  },

  // Dashboard Stats
  async getDashboardStats() {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/dashboard/stats`, {
      method: 'GET',
      headers,
    });
    return handleResponse<{
      totalCollections: number;
      totalExpenses: number;
      balance: number;
      pendingVerification: number;
      memberCount: number;
      collectionsByType: Record<string, number>;
      expensesByCategory: Record<string, number>;
      collectionTarget: number;
    }>(response);
  },

  // Collections
  async getCollections() {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/collections`, {
      method: 'GET',
      headers,
    });
    return handleResponse<any[]>(response);
  },

  async createCollection(collectionData: {
    donorName: string;
    amount: number;
    type: string;
    paymentMode: string;
    notes?: string;
  }) {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/collections`, {
      method: 'POST',
      headers,
      body: JSON.stringify(collectionData),
    });
    return handleResponse<any>(response);
  },

  async deleteCollection(id: number) {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/collections/${id}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<any>(response);
  },

  // Expenses
  async getExpenses() {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/expenses`, {
      method: 'GET',
      headers,
    });
    return handleResponse<any[]>(response);
  },

  async createExpense(expenseData: {
    title: string;
    amount: number;
    notes?: string;
    receiptImage?: string | null;
  }) {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers,
      body: JSON.stringify(expenseData),
    });
    return handleResponse<any>(response);
  },

  async verifyExpense(id: number) {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/expenses/${id}/verify`, {
      method: 'PUT',
      headers,
    });
    return handleResponse<any>(response);
  },

  async deleteExpense(id: number) {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/expenses/${id}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<any>(response);
  },

  // Inventory
  async getInventory() {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/inventory`, {
      method: 'GET',
      headers,
    });
    return handleResponse<any[]>(response);
  },

  async createInventoryItem(itemData: {
    itemName: string;
    quantity: number;
    status: string;
    location: string;
  }) {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/inventory`, {
      method: 'POST',
      headers,
      body: JSON.stringify(itemData),
    });
    return handleResponse<any>(response);
  },

  async updateInventoryItem(id: number, updates: any) {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/inventory/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    return handleResponse<any>(response);
  },

  async deleteInventoryItem(id: number) {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/inventory/${id}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<any>(response);
  },

  // Members
  async getMembers() {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/members`, {
      method: 'GET',
      headers,
    });
    return handleResponse<any[]>(response);
  },

  async updateMemberRole(userId: number, role: string, designation?: string) {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/members/${userId}/role`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ role, designation }),
    });
    return handleResponse<any>(response);
  }
};
