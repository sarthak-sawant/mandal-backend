import { useSettings } from '@/context/SettingsContext';

export function useTheme() {
  const { colors, activeTheme } = useSettings();
  return {
    ...colors,
    activeTheme,
  };
}
