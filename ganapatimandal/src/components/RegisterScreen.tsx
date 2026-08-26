import React, { useState, useEffect } from 'react';
import { StyleSheet, TextInput, Pressable, View, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/use-theme';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '../constants/theme';

export default function RegisterScreen({ onSwitch }: { onSwitch: () => void }) {
  const { register, serverIp, serverPort, updateServerIp } = useAuth();
  const theme = useTheme();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [designation, setDesignation] = useState('');
  const [customDesignation, setCustomDesignation] = useState('');
  const [showDesignationDropdown, setShowDesignationDropdown] = useState(false);
  const [ipAddress, setIpAddress] = useState(serverIp);
  const [port, setPort] = useState(serverPort);
  const [showSettings, setShowSettings] = useState(false);
  const [ipSaved, setIpSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isCustomFocused, setIsCustomFocused] = useState(false);

  useEffect(() => {
    setIpAddress(serverIp);
  }, [serverIp]);

  useEffect(() => {
    setPort(serverPort);
  }, [serverPort]);

  const handleSaveIp = async () => {
    try {
      await updateServerIp(ipAddress, port);
      setIpSaved(true);
      setError(null);
      setTimeout(() => setIpSaved(false), 2000);
    } catch (e: any) {
      setError('Failed to update Server Address');
    }
  };

  const handleRegister = async () => {
    const finalDesignation = designation === 'Other' ? customDesignation : designation;
    if (!name || !phone || !password || !finalDesignation) {
      setError('Please fill in all required fields');
      return;
    }
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register(name, phone, password, finalDesignation || undefined);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to connect. Check your server IP/connection.');
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles(theme);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.container}>
          {/* Header/Hero */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Svg width={90} height={90} viewBox="0 0 100 100">
                {/* Left ear */}
                <Path d="M 40,35 C 25,35 20,45 25,55 C 30,65 40,65 40,65" fill="none" stroke={theme.primary} strokeWidth={3} strokeLinecap="round" />
                {/* Right ear */}
                <Path d="M 60,35 C 75,35 80,45 75,55 C 70,65 60,65 60,65" fill="none" stroke={theme.primary} strokeWidth={3} strokeLinecap="round" />
                {/* Head / Crown */}
                <Path d="M 42,25 L 50,8 L 58,25 Z" fill={theme.primary} />
                <Path d="M 45,28 L 50,22 L 55,28 Z" fill={theme.primaryDark} opacity={0.85} />
                <Path d="M 38,35 C 38,20 62,20 62,35 C 62,48 50,45 50,55" fill="none" stroke={theme.primary} strokeWidth={4.5} strokeLinecap="round" />
                {/* Trunk */}
                <Path d="M 50,52 C 50,65 62,65 62,75 C 62,82 55,85 50,85 C 45,85 43,82 45,78" fill="none" stroke={theme.primary} strokeWidth={3.5} strokeLinecap="round" />
                {/* Tusk / Tooth */}
                <Path d="M 46,55 L 43,58" fill="none" stroke={theme.primary} strokeWidth={2.5} />
                {/* Modak */}
                <Circle cx={65} cy={75} r={3.5} fill={theme.primaryDark} />
                {/* Tilak */}
                <Path d="M 48,31 Q 50,27 52,31 Z" fill={theme.primaryDark} />
                <Path d="M 46,35 Q 50,33 54,35" fill="none" stroke={theme.primary} strokeWidth={1.5} />
              </Svg>
            </View>

            <ThemedText type="title" style={styles.title}>
              मंडळ सदस्य नोंदणी
            </ThemedText>
            <ThemedText style={styles.subtitle} themeColor="textSecondary">
              Register as Mandal Volunteer / Organizer
            </ThemedText>
          </View>

          {/* Form Card */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" style={styles.cardTitle}>
              CREATE VOLUNTEER ACCOUNT
            </ThemedText>

            {error && (
              <View style={styles.errorBox}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            )}

            <View style={styles.inputGroup}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
                Full Name *
              </ThemedText>
              <TextInput
                style={[styles.input, isNameFocused && styles.inputFocused]}
                placeholder="Enter your full name"
                placeholderTextColor={theme.textSecondary + '70'}
                value={name}
                onChangeText={setName}
                onFocus={() => setIsNameFocused(true)}
                onBlur={() => setIsNameFocused(false)}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
                Phone Number *
              </ThemedText>
              <TextInput
                style={[styles.input, isPhoneFocused && styles.inputFocused]}
                placeholder="Enter 10-digit number"
                placeholderTextColor={theme.textSecondary + '70'}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                autoCapitalize="none"
                onFocus={() => setIsPhoneFocused(true)}
                onBlur={() => setIsPhoneFocused(false)}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
                Designation / Role *
              </ThemedText>
              
              {/* Dropdown Trigger */}
              <Pressable
                style={[styles.dropdownTrigger, showDesignationDropdown && { borderColor: theme.primary }]}
                onPress={() => setShowDesignationDropdown(!showDesignationDropdown)}
              >
                <ThemedText style={[styles.dropdownTriggerText, designation ? { color: theme.text } : { color: theme.textSecondary + '70' }]}>
                  {designation || 'Select Designation'}
                </ThemedText>
                <ThemedText style={{ color: theme.primary, fontSize: 12 }}>
                  {showDesignationDropdown ? '▲' : '▼'}
                </ThemedText>
              </Pressable>

              {/* Dropdown Options */}
              {showDesignationDropdown && (
                <View style={styles.dropdownOptionsContainer}>
                  {['Volunteer', 'Co-ordinator', 'Treasurer', 'Committee Member', 'Secretary', 'President', 'Other'].map(opt => (
                    <Pressable
                      key={opt}
                      style={[styles.dropdownOption, designation === opt && styles.dropdownOptionActive]}
                      onPress={() => {
                        setDesignation(opt);
                        setShowDesignationDropdown(false);
                      }}
                    >
                      <ThemedText style={[styles.dropdownOptionText, designation === opt && styles.dropdownOptionTextActive]}>
                        {opt}
                      </ThemedText>
                      {designation === opt && <ThemedText style={{ color: theme.primary, fontWeight: '700' }}>✓</ThemedText>}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {designation === 'Other' && (
              <View style={styles.inputGroup}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
                  Enter Custom Designation *
                </ThemedText>
                <TextInput
                  style={[styles.input, isCustomFocused && styles.inputFocused]}
                  placeholder="e.g. Joint Secretary, Mandap Helper"
                  placeholderTextColor={theme.textSecondary + '70'}
                  value={customDesignation}
                  onChangeText={setCustomDesignation}
                  onFocus={() => setIsCustomFocused(true)}
                  onBlur={() => setIsCustomFocused(false)}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
                Password *
              </ThemedText>
              <TextInput
                style={[styles.input, isPasswordFocused && styles.inputFocused]}
                placeholder="Create a password"
                placeholderTextColor={theme.textSecondary + '70'}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Register & Sign In</ThemedText>
              )}
            </Pressable>

            <Pressable style={styles.switchButton} onPress={onSwitch}>
              <ThemedText type="small" style={styles.switchText}>
                Already a volunteer? <ThemedText type="smallBold" style={{ color: theme.primary }}>Login Here</ThemedText>
              </ThemedText>
            </Pressable>
          </ThemedView>

          {/* Server Config Collapsible */}
          <View style={styles.settingsSection}>
            <Pressable
              style={styles.settingsToggle}
              onPress={() => setShowSettings(!showSettings)}
            >
              <ThemedText type="small" style={[styles.settingsToggleText, { color: theme.primary }]}>
                {showSettings ? 'Hide' : 'Configure'} Backend Connection Address
              </ThemedText>
            </Pressable>

            {showSettings && (
              <ThemedView type="backgroundElement" style={styles.settingsCard}>
                <ThemedText type="code" style={styles.settingsInfo}>
                  Enter the IP Address of the host computer running the backend server.
                </ThemedText>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
                    <ThemedText type="small" themeColor="textSecondary">IP Address</ThemedText>
                    <TextInput
                      style={styles.settingsInput}
                      value={ipAddress}
                      onChangeText={setIpAddress}
                      placeholder="e.g. 192.168.1.15"
                      placeholderTextColor={theme.textSecondary + '70'}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <ThemedText type="small" themeColor="textSecondary">Port</ThemedText>
                    <TextInput
                      style={styles.settingsInput}
                      value={port}
                      onChangeText={setPort}
                      placeholder="3000"
                      placeholderTextColor={theme.textSecondary + '70'}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Pressable
                  style={styles.saveIpButton}
                  onPress={handleSaveIp}
                >
                  <ThemedText style={styles.saveIpButtonText}>
                    {ipSaved ? 'Connection IP Saved!' : 'Save Server Settings'}
                  </ThemedText>
                </Pressable>
              </ThemedView>
            )}
          </View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.four,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.four,
    width: '100%',
  },
  logoContainer: {
    padding: Spacing.two,
    borderRadius: 50,
    backgroundColor: theme.primaryLight,
    borderWidth: 1,
    borderColor: theme.primaryBorder,
    marginBottom: Spacing.three,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: '800',
    color: theme.primary,
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.one,
    letterSpacing: 0.5,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: Spacing.four,
    borderRadius: 24,
    shadowColor: theme.activeTheme === 'dark' ? '#000' : '#475569',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: theme.activeTheme === 'dark' ? 0.25 : 0.08,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(226, 232, 240, 0.8)',
  },
  cardTitle: {
    fontSize: 14,
    letterSpacing: 1.5,
    marginBottom: Spacing.four,
    textAlign: 'center',
    color: theme.primary,
    fontWeight: '800',
  },
  errorBox: {
    backgroundColor: theme.activeTheme === 'dark' ? '#311B1B' : '#FFEBEE',
    padding: Spacing.two,
    borderRadius: 10,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? '#5A2A2A' : '#FFCDD2',
  },
  errorText: {
    color: '#E53935',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: Spacing.three,
  },
  label: {
    marginBottom: Spacing.one,
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)',
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    color: theme.text,
    fontSize: 16,
    fontWeight: '500',
  },
  inputFocused: {
    borderColor: theme.primary,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255, 87, 34, 0.03)' : 'rgba(255, 87, 34, 0.01)',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)',
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    marginTop: 4,
  },
  dropdownTriggerText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownOptionsContainer: {
    backgroundColor: theme.activeTheme === 'dark' ? '#1B253D' : '#F8FAFC',
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
    borderRadius: 14,
    marginTop: Spacing.two,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)',
  },
  dropdownOptionActive: {
    backgroundColor: theme.primaryLight,
  },
  dropdownOptionText: {
    fontSize: 15,
    opacity: 0.9,
  },
  dropdownOptionTextActive: {
    color: theme.primary,
    fontWeight: '700',
  },
  button: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.three,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    backgroundColor: theme.primaryDark,
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  switchButton: {
    marginTop: Spacing.four,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 13,
  },
  settingsSection: {
    width: '100%',
    maxWidth: 400,
    marginTop: Spacing.five,
    alignItems: 'center',
  },
  settingsToggle: {
    padding: Spacing.two,
  },
  settingsToggleText: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.9,
  },
  settingsCard: {
    width: '100%',
    padding: Spacing.three,
    borderRadius: 16,
    marginTop: Spacing.two,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  settingsInfo: {
    fontSize: 11,
    opacity: 0.8,
    marginBottom: Spacing.three,
    lineHeight: 15,
  },
  row: {
    flexDirection: 'row',
  },
  settingsInput: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.02)',
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: 8,
    color: theme.text,
    fontSize: 14,
  },
  saveIpButton: {
    backgroundColor: theme.activeTheme === 'dark' ? '#232D42' : '#334155',
    borderRadius: 8,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  saveIpButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
