import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/use-theme';
import { BlurView } from 'expo-blur';
import { StyleSheet, Platform } from 'react-native';

export default function AppTabs() {
  const colors = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.activeTheme === 'dark' ? '#94A3B8' : '#64748B',
        tabBarIconStyle: {
          marginTop: Platform.OS === 'ios' ? 0 : 6,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: '2%',
          right: '2%',
          height: 60,
          borderRadius: 30,
          borderWidth: 1,
          borderColor: colors.activeTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
          backgroundColor: colors.activeTheme === 'dark' ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.75)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: colors.activeTheme === 'dark' ? 0.3 : 0.08,
          shadowRadius: 16,
          elevation: 6,
          overflow: 'hidden',
          borderTopWidth: 0,
        },
        tabBarBackground: () => (
          <BlurView
            tint={colors.activeTheme === 'dark' ? 'dark' : 'light'}
            intensity={90}
            style={StyleSheet.absoluteFill}
          />
        ),
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="collections"
        options={{
          title: 'Collections',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Mandal Stats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="scheduler"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="gallery"
        options={{
          title: 'Gallery',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="images-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
