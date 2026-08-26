import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Memory fallback cache in case AsyncStorage native module is not linked/working
const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      // If we are on web, check localStorage first
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      }
      
      const value = await AsyncStorage.getItem(key);
      return value;
    } catch (error) {
      console.warn(`AsyncStorage.getItem failed for key "${key}", using memory fallback:`, error);
      return memoryStorage[key] || null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
      }
      
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn(`AsyncStorage.setItem failed for key "${key}", saving to memory cache:`, error);
      memoryStorage[key] = value;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
      }
      
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn(`AsyncStorage.removeItem failed for key "${key}", deleting from memory cache:`, error);
      delete memoryStorage[key];
    }
  }
};
