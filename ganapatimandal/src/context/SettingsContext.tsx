import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { safeStorage as AsyncStorage } from '../services/storage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type OccasionType = 'ganesh';

export interface OccasionConfig {
  id: OccasionType;
  name: string;
  emoji: string;
  title: string;
  marathiTitle: string;
  subtitle: string;
  welcomeText: string;
  countdownTitle: string;
  countdownDate: string;
  whatsappHeader: string;
  whatsappFooter: string;
}

export const Occasions: Record<OccasionType, OccasionConfig> = {
  ganesh: {
    id: 'ganesh',
    name: 'Ganeshotsav',
    emoji: '🌺',
    title: 'Saiprasad Kala, Krida v Sanskrutik Mitra Mandal',
    marathiTitle: 'साईप्रसाद कला, क्रीडा व सांस्कृतिक मित्र मंडळ',
    subtitle: 'Ganeshotsav Accounts & Management',
    welcomeText: 'Jai Ganesha,',
    countdownTitle: 'GANESH CHATURTHI 2026',
    countdownDate: '2026-09-14T00:00:00',
    whatsappHeader: '🚩 *साईप्रसाद कला, क्रीडा व सांस्कृतिक मित्र मंडळ हिशोब अहवाल २०२६* 🚩',
    whatsappFooter: '🙏 *गणपती बाप्पा मोरया! मंगलमूर्ती मोरया!* आणि मनःपूर्वक धन्यवाद!',
  }
};

export const OccasionColors: Record<OccasionType, {
  light: { primary: string; primaryDark: string; primaryLight: string; primaryBorder: string };
  dark: { primary: string; primaryDark: string; primaryLight: string; primaryBorder: string };
}> = {
  ganesh: {
    light: { primary: '#FF5722', primaryDark: '#D84315', primaryLight: '#FFF3F0', primaryBorder: '#FFCCBC' },
    dark: { primary: '#FF7043', primaryDark: '#FF5722', primaryLight: '#2A120B', primaryBorder: '#5D2516' },
  }
};

interface SettingsContextType {
  themeMode: ThemeMode;
  occasion: OccasionType;
  updateThemeMode: (mode: ThemeMode) => Promise<void>;
  updateOccasion: (occ: OccasionType) => Promise<void>;
  activeTheme: 'light' | 'dark';
  occasionConfig: OccasionConfig;
  colors: {
    text: string;
    background: string;
    backgroundElement: string;
    backgroundSelected: string;
    textSecondary: string;
    primary: string;
    primaryDark: string;
    primaryLight: string;
    primaryBorder: string;
  };
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [occasion, setOccasion] = useState<OccasionType>('ganesh');

  useEffect(() => {
    async function loadSettings() {
      try {
        const storedThemeMode = await AsyncStorage.getItem('mandal_theme_mode');
        if (storedThemeMode) setThemeMode(storedThemeMode as ThemeMode);
        // Force occasion to ganesh
        setOccasion('ganesh');
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    }
    loadSettings();
  }, []);

  const updateThemeMode = async (mode: ThemeMode) => {
    setThemeMode(mode);
    await AsyncStorage.setItem('mandal_theme_mode', mode);
  };

  const updateOccasion = async (occ: OccasionType) => {
    // No-op as other occasions are removed
    setOccasion('ganesh');
  };

  const activeTheme: 'light' | 'dark' = themeMode === 'system' 
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : (themeMode === 'dark' ? 'dark' : 'light');

  // Base colors
  const baseColors = {
    light: {
      text: '#0F172A',
      background: '#F1F5F9',
      backgroundElement: '#FFFFFF',
      backgroundSelected: '#E2E8F0',
      textSecondary: '#64748B',
    },
    dark: {
      text: '#F8FAFC',
      background: '#0B0F19',
      backgroundElement: '#151D30',
      backgroundSelected: '#1E293B',
      textSecondary: '#94A3B8',
    },
  };

  const currentBaseColors = baseColors[activeTheme];
  const currentOccasionColors = OccasionColors[occasion][activeTheme];

  const colors = {
    ...currentBaseColors,
    ...currentOccasionColors,
  };

  const value = {
    themeMode,
    occasion,
    updateThemeMode,
    updateOccasion,
    activeTheme,
    occasionConfig: Occasions[occasion],
    colors,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
