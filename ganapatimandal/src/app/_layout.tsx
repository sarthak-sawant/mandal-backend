import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import { useState } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import LoginScreen from '@/components/LoginScreen';
import RegisterScreen from '@/components/RegisterScreen';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');

  console.log('[Layout] AppContent render state:', { isLoading, isAuthenticated, authScreen });

  const overlay = <AnimatedSplashOverlay dismiss={!isLoading} />;

  if (isLoading) {
    return overlay;
  }

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1 }}>
        {overlay}
        {authScreen === 'login' ? (
          <LoginScreen onSwitch={() => setAuthScreen('register')} />
        ) : (
          <RegisterScreen onSwitch={() => setAuthScreen('login')} />
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {overlay}
      <AppTabs />
    </View>
  );
}

function ThemedTabLayout() {
  const { activeTheme } = useSettings();
  return (
    <ThemeProvider value={activeTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppContent />
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <ThemedTabLayout />
      </AuthProvider>
    </SettingsProvider>
  );
}

