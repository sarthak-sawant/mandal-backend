import React, { useState, useEffect } from 'react';
import { StyleSheet, Pressable, ScrollView, View, ActivityIndicator, RefreshControl, Dimensions, Platform, Modal, Alert, Linking, Share } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSettings, Occasions, ThemeMode, OccasionType } from '@/context/SettingsContext';

export default function HomeScreen() {
  const { user, logout, serverIp } = useAuth();
  const [isLogoutConfirmVisible, setIsLogoutConfirmVisible] = useState(false);
  const theme = useTheme();
  const { themeMode, occasion, updateThemeMode, updateOccasion, occasionConfig } = useSettings();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>({
    totalCollections: 0,
    totalExpenses: 0,
    balance: 0,
    pendingVerification: 0,
    memberCount: 0,
    collectionTarget: 50000,
    collectionsByType: {},
    expensesByCategory: {}
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [weather, setWeather] = useState<any>({
    temp: 28,
    condition: 'Cloudy ☁️',
    humidity: '80%',
    wind: '12 km/h',
    rainProbability: '0%',
    alert: 'Normal weather. Enjoy Ganeshotsav!',
    loading: true
  });

  const loadData = async (showRefresher = false) => {
    if (showRefresher) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const statsData = await api.getDashboardStats();
      setStats(statsData);

      const [expenses, collections] = await Promise.all([
        api.getExpenses(),
        api.getCollections()
      ]);

      const activityFeed = [
        ...expenses.map(e => ({ ...e, feedType: 'expense' })),
        ...collections.map(c => ({ ...c, feedType: 'collection' }))
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setRecentActivity(activityFeed);
    } catch (e: any) {
      console.error(e);
      setError('Could not fetch data. Check server connection or pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };



  useEffect(() => {
    loadData();
    fetchWeather();

    // Auto-refresh weather forecast every 30 minutes
    const weatherInterval = setInterval(() => {
      fetchWeather();
    }, 30 * 60 * 1000);

    return () => clearInterval(weatherInterval);
  }, [serverIp]);

  const onRefresh = () => {
    loadData(true);
    fetchWeather();
  };

  const fetchWeather = async () => {
    try {
      const response = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=20.048414&longitude=73.779829&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=precipitation_probability&forecast_days=1'
      );
      const data = await response.json();
      if (data && data.current) {
        const temp = Math.round(data.current.temperature_2m);
        const code = data.current.weather_code;
        const humidity = `${data.current.relative_humidity_2m}%`;
        const wind = `${Math.round(data.current.wind_speed_10m)} km/h`;
        
        let rainProbability = '0%';
        if (data.hourly && data.hourly.precipitation_probability) {
          const currentHour = new Date().getHours();
          rainProbability = `${data.hourly.precipitation_probability[currentHour] || 0}%`;
        }
        
        let condition = 'Cloudy ☁️';
        let alert = 'Normal weather. Enjoy Ganeshotsav!';
        
        if (code === 0) {
          condition = 'Clear Sky ☀️';
          alert = 'Good weather. Keep mandap open.';
        } else if (code >= 1 && code <= 3) {
          condition = 'Partly Cloudy ⛅';
          alert = 'Cloudy. Keep plastics ready.';
        } else if (code >= 51 && code <= 65) {
          condition = 'Raining 🌧️';
          alert = 'Raining. Put plastic covers at entrance.';
        } else if (code >= 80 && code <= 99) {
          condition = 'Thunderstorms ⛈️';
          alert = 'Heavy rain! Put side covers down and check main switch.';
        }
        
        setWeather({
          temp,
          condition,
          humidity,
          wind,
          rainProbability,
          alert,
          loading: false
        });
      }
    } catch (e) {
      console.error('Failed to fetch weather:', e);
      setWeather(prev => ({ ...prev, loading: false }));
    }
  };



  const getDaysToTargetDate = () => {
    const targetDate = new Date(occasionConfig.countdownDate);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return `${diffDays} Days Left`;
    } else if (diffDays === 0) {
      return `Bappa is Here Today! 🎉`;
    } else {
      return `${occasionConfig.name} Completed 🙏`;
    }
  };

  const formatRupees = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const handleShareStats = async () => {
    if (!stats) return;
    try {
      const shareMessage = `🙏 *${occasionConfig.title}* 🙏\n\n📊 *Mandal Financial Summary:*\n----------------------------------------\n• *Total Collections (एकूण जमा):* ${formatRupees(stats.totalCollections)}\n• *Total Expenses (एकूण खर्च):* ${formatRupees(stats.totalExpenses)}\n• *Net Balance (शिल्लक):* ${formatRupees(stats.balance)}\n\n${occasionConfig.whatsappFooter.replace(/\*/g, '')}`;
      
      await Share.share({
        message: shareMessage,
        title: `${occasionConfig.title} Financials`
      });
    } catch (err: any) {
      Alert.alert('Error', 'Failed to share financial summary');
    }
  };

  const spentPercent = stats && stats.totalCollections > 0
    ? Math.round((stats.totalExpenses / stats.totalCollections) * 100)
    : 0;
  const spentProgressBarWidth = Math.min(spentPercent, 100);

  const styles = getStyles(theme);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header Banner */}
          <View style={styles.header}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: Spacing.two }}>
              <Pressable onLongPress={() => updateThemeMode(themeMode === 'dark' ? 'light' : 'dark')} delayLongPress={800}>
                <Svg width={46} height={46} viewBox="0 0 100 100">
                {/* Left ear */}
                <Path d="M 40,35 C 25,35 20,45 25,55 C 30,65 40,65 40,65" fill="none" stroke={theme.primary} strokeWidth={3.5} strokeLinecap="round" />
                {/* Right ear */}
                <Path d="M 60,35 C 75,35 80,45 75,55 C 70,65 60,65 60,65" fill="none" stroke={theme.primary} strokeWidth={3.5} strokeLinecap="round" />
                {/* Head / Crown */}
                <Path d="M 42,25 L 50,8 L 58,25 Z" fill={theme.primary} />
                <Path d="M 45,28 L 50,22 L 55,28 Z" fill={theme.primaryDark} opacity={0.85} />
                <Path d="M 38,35 C 38,20 62,20 62,35 C 62,48 50,45 50,55" fill="none" stroke={theme.primary} strokeWidth={5} strokeLinecap="round" />
                {/* Trunk */}
                <Path d="M 50,52 C 50,65 62,65 62,75 C 62,82 55,85 50,85 C 45,85 43,82 45,78" fill="none" stroke={theme.primary} strokeWidth={4} strokeLinecap="round" />
                {/* Tusk / Tooth */}
                <Path d="M 46,55 L 43,58" fill="none" stroke={theme.primary} strokeWidth={3} />
                {/* Modak */}
                <Circle cx={65} cy={75} r={3.5} fill={theme.primaryDark} />
                {/* Tilak */}
                <Path d="M 48,31 Q 50,27 52,31 Z" fill={theme.primaryDark} />
                <Path d="M 46,35 Q 50,33 54,35" fill="none" stroke={theme.primary} strokeWidth={2.5} />
              </Svg>
              </Pressable>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.welcomeText} themeColor="textSecondary" numberOfLines={1}>
                  {occasionConfig.welcomeText}
                </ThemedText>
                <ThemedText type="subtitle" style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                  {user?.name || 'Mandal Member'}
                </ThemedText>
                <View style={styles.roleContainer}>
                  <ThemedText type="code" style={styles.roleText} themeColor="textSecondary" numberOfLines={1}>
                    {user?.designation || 'Volunteer'} • {user?.role?.toUpperCase()}
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.headerActions}>
              <Pressable style={styles.settingsButton} onPress={() => setIsSettingsVisible(true)}>
                <Ionicons name="settings-outline" size={20} color={theme.primary} />
              </Pressable>
              
              <Pressable style={styles.logoutButton} onPress={() => setIsLogoutConfirmVisible(true)}>
                <ThemedText type="smallBold" style={styles.logoutText}>Logout</ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Festival Countdown Card */}
          <View style={styles.countdownCard}>
            <View style={styles.countdownRow}>
              <View style={styles.countdownTextContainer}>
                <ThemedText type="smallBold" style={styles.countdownTitle}>
                  {occasionConfig.countdownTitle}
                </ThemedText>
                <ThemedText style={styles.countdownSub}>
                  {getDaysToTargetDate()}
                </ThemedText>
              </View>
              <View style={styles.emojiContainer}>
                <ThemedText style={{ fontSize: 32, lineHeight: 40, textAlign: 'center' }}>{occasionConfig.emoji}</ThemedText>
              </View>
            </View>
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
              <Pressable style={styles.retryButton} onPress={() => loadData()}>
                <ThemedText type="smallBold" style={{ color: '#fff' }}>Retry Connection</ThemedText>
              </Pressable>
              <ThemedText type="code" style={styles.ipText}>
                Active Server: {serverIp}
              </ThemedText>
            </View>
          )}

          {loading && !refreshing ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText style={{ marginTop: Spacing.two }}>Connecting to server...</ThemedText>
            </View>
          ) : (
            <View style={styles.dashboardContent}>
              {/* Quick Access Tiles */}
              <View style={styles.quickAccessRow}>
                <Pressable style={[styles.quickAccessTile, { backgroundColor: theme.primaryLight, borderColor: theme.primaryBorder }]} onPress={() => router.push('/scheduler')}>
                  <Ionicons name="calendar" size={26} color={theme.primary} />
                  <ThemedText type="smallBold" style={{ color: theme.primary, marginTop: 6 }}>Schedule</ThemedText>
                </Pressable>
                <Pressable style={[styles.quickAccessTile, { backgroundColor: theme.primaryLight, borderColor: theme.primaryBorder }]} onPress={() => router.push('/gallery')}>
                  <Ionicons name="images" size={26} color={theme.primary} />
                  <ThemedText type="smallBold" style={{ color: theme.primary, marginTop: 6 }}>Media Hub</ThemedText>
                </Pressable>
              </View>

              {/* Financial Dashboard Stats */}
              <View style={styles.statsContainer}>
                {/* Main Balance Card */}
                <Pressable onLongPress={handleShareStats} delayLongPress={800} style={({ pressed }) => pressed && { opacity: 0.9 }}>
                  <ThemedView type="backgroundElement" style={styles.mainCard}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.mainCardLabel}>
                    TOTAL BALANCE
                  </ThemedText>
                  <ThemedText style={styles.mainBalance}>
                    {formatRupees(stats.balance)}
                  </ThemedText>
                  <View style={styles.cardSeparator} />
                  <View style={styles.memberCountRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="people" size={16} color={theme.primary} />
                      <ThemedText type="small" themeColor="textSecondary">Active Volunteers:</ThemedText>
                    </View>
                    <ThemedText type="smallBold" style={{ color: theme.text }}>{stats.memberCount}</ThemedText>
                  </View>
                </ThemedView>
                </Pressable>

                {/* Grid for collection & expenses */}
                <View style={styles.statsGrid}>
                  <ThemedView type="backgroundElement" style={[styles.gridCard, styles.collectionGridCard]}>
                    <View style={styles.gridCardHeader}>
                      <Ionicons name="trending-up" size={16} color="#10B981" />
                      <ThemedText type="small" themeColor="textSecondary">COLLECTIONS</ThemedText>
                    </View>
                    <ThemedText style={styles.collectionValue}>
                      {formatRupees(stats.totalCollections)}
                    </ThemedText>
                  </ThemedView>

                  <ThemedView type="backgroundElement" style={[styles.gridCard, styles.expenseGridCard]}>
                    <View style={styles.gridCardHeader}>
                      <Ionicons name="trending-down" size={16} color="#EF4444" />
                      <ThemedText type="small" themeColor="textSecondary">EXPENSES</ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <ThemedText style={styles.expenseValue}>
                        {formatRupees(stats.totalExpenses)}
                      </ThemedText>
                    </View>
                    {stats.pendingVerification > 0 && (
                      <View style={styles.badgeContainer}>
                        <ThemedText type="code" style={styles.badgeText}>
                          {stats.pendingVerification} pending
                        </ThemedText>
                      </View>
                    )}
                  </ThemedView>
                </View>
              </View>

              {/* Spent percentage bar */}
              <ThemedView type="backgroundElement" style={styles.targetCard}>
                <View style={styles.targetHeader}>
                  <ThemedText type="small" themeColor="textSecondary">Funds Spent Percentage</ThemedText>
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    {spentPercent}% of Collections
                  </ThemedText>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${spentProgressBarWidth}%`, backgroundColor: theme.primary }]} />
                </View>
              </ThemedView>

              {/* Pandal Weather Forecast */}
              <View style={styles.sectionHeaderRow}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>
                  LIVE PANDAL WEATHER
                </ThemedText>
              </View>
              <Pressable onLongPress={() => { fetchWeather(); Alert.alert('Weather Synced', 'Live weather manually synchronized. 🌦️'); }} delayLongPress={800} style={({ pressed }) => pressed && { opacity: 0.9 }}>
                <ThemedView type="backgroundElement" style={styles.weatherCard}>
                <View style={styles.weatherHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons 
                      name={weather.condition.includes('☀️') ? 'sunny' : weather.condition.includes('⛅') ? 'partly-sunny' : 'rainy'} 
                      size={24} 
                      color={weather.condition.includes('☀️') ? '#F59E0B' : theme.primary} 
                      style={{ marginRight: 8 }} 
                    />
                    <View>
                      <ThemedText type="defaultBold" style={{ fontSize: 14 }}>
                        Weather
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {weather.condition}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.weatherTempText}>
                    {weather.temp}°C
                  </ThemedText>
                </View>

                <View style={styles.weatherStatsRow}>
                  <View style={styles.weatherStatCol}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.weatherStatLabel}>
                      HUMIDITY
                    </ThemedText>
                    <ThemedText type="smallBold">
                      {weather.humidity}
                    </ThemedText>
                  </View>
                  <View style={styles.weatherStatDivider} />
                  <View style={styles.weatherStatCol}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.weatherStatLabel}>
                      RAIN PROB.
                    </ThemedText>
                    <ThemedText type="smallBold">
                      {weather.rainProbability}
                    </ThemedText>
                  </View>
                  <View style={styles.weatherStatDivider} />
                  <View style={styles.weatherStatCol}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.weatherStatLabel}>
                      WIND SPEED
                    </ThemedText>
                    <ThemedText type="smallBold">
                      {weather.wind}
                    </ThemedText>
                  </View>
                </View>

                <View style={[styles.crowdDividerHoriz, { backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)' }]} />

                <View style={styles.weatherAlertRow}>
                  <Ionicons name="alert-circle-outline" size={16} color={weather.alert.includes('Alert') ? '#EF4444' : '#10B981'} style={{ marginRight: 8 }} />
                  <ThemedText type="small" style={{ flex: 1, fontWeight: '600', fontSize: 11, color: weather.alert.includes('Alert') ? '#EF4444' : theme.textSecondary }}>
                    {weather.alert}
                  </ThemedText>
                </View>
              </ThemedView>
              </Pressable>


              {/* Recent Activity Feed */}
              <View style={styles.sectionHeaderRow}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>
                  RECENT TRANSACTIONS
                </ThemedText>
              </View>
              {recentActivity.length === 0 ? (
                <ThemedView type="backgroundElement" style={styles.emptyFeed}>
                  <Ionicons name="receipt-outline" size={32} color={theme.textSecondary} style={{ marginBottom: 8 }} />
                  <ThemedText type="small" themeColor="textSecondary">No transactions recorded yet.</ThemedText>
                </ThemedView>
              ) : (
                <View style={styles.feedList}>
                  {recentActivity.map((item, index) => {
                    const isExpense = item.feedType === 'expense';
                    const detailColor = isExpense ? '#EF4444' : '#10B981';
                    return (
                      <ThemedView key={index} type="backgroundElement" style={[styles.feedCard, { borderLeftColor: detailColor, borderLeftWidth: 4 }]}>
                        <View style={styles.feedRow}>
                          <View style={styles.feedMain}>
                            <ThemedText type="default" style={styles.feedTitleText}>
                              {isExpense ? item.title : `Donation: ${item.donor_name || 'Anonymous'}`}
                            </ThemedText>
                            <ThemedText type="code" style={styles.feedSub} themeColor="textSecondary">
                              {isExpense ? `Paid by ${item.paid_by || 'Mandal'}` : `${item.type} • ${item.payment_mode || 'UPI'}`}
                            </ThemedText>
                          </View>
                          <View style={styles.feedAmountContainer}>
                            <ThemedText type="smallBold" style={[styles.feedAmount, { color: detailColor }]}>
                              {isExpense ? '-' : '+'}{formatRupees(item.amount)}
                            </ThemedText>
                            <ThemedText type="code" style={styles.feedDate}>
                              {new Date(item.date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short'
                              })}
                            </ThemedText>
                          </View>
                        </View>
                      </ThemedView>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Bottom spacing */}
          <View style={{ height: BottomTabInset + Spacing.six }} />
        </ScrollView>
      </SafeAreaView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={isLogoutConfirmVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsLogoutConfirmVisible(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <ThemedView type="backgroundElement" style={styles.confirmModalContent}>
            <View style={styles.confirmIconContainer}>
              <Ionicons name="log-out-outline" size={32} color="#EF4444" />
            </View>
            
            <ThemedText type="subtitle" style={styles.confirmTitle}>
              Log Out?
            </ThemedText>
            
            <ThemedText style={styles.confirmSubtitle} themeColor="textSecondary">
              Are you sure you want to log out of the Saiprasad Mandal app? You will need to enter your credentials to sign back in.
            </ThemedText>
            
            <View style={styles.confirmActions}>
              <Pressable 
                style={[styles.confirmButton, styles.cancelButton]} 
                onPress={() => setIsLogoutConfirmVisible(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </Pressable>
              
              <Pressable 
                style={[styles.confirmButton, styles.logoutConfirmButton]} 
                onPress={() => {
                  setIsLogoutConfirmVisible(false);
                  logout();
                }}
              >
                <ThemedText style={styles.logoutConfirmButtonText}>Log Out</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={isSettingsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle" style={styles.modalTitle}>Settings</ThemedText>
              <Pressable onPress={() => setIsSettingsVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Theme Settings */}
              <ThemedText type="smallBold" style={[styles.modalSectionTitle, { color: theme.primary }]}>
                APPEARANCE
              </ThemedText>
              <View style={styles.optionsContainer}>
                {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => {
                  const isActive = themeMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      style={[
                        styles.optionRow,
                        isActive && { backgroundColor: theme.primaryLight, borderColor: theme.primary }
                      ]}
                      onPress={() => updateThemeMode(mode)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                        <Ionicons
                          name={
                            mode === 'system'
                              ? 'options-outline'
                              : mode === 'light'
                              ? 'sunny-outline'
                              : 'moon-outline'
                          }
                          size={18}
                          color={isActive ? theme.primary : theme.textSecondary}
                        />
                        <ThemedText style={isActive ? { color: theme.primary, fontWeight: '700' } : undefined}>
                          {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
                        </ThemedText>
                      </View>
                      {isActive && <Ionicons name="checkmark" size={18} color={theme.primary} />}
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.modalSeparator} />

              {/* Pandal Info & Services */}
              <ThemedText type="smallBold" style={[styles.modalSectionTitle, { color: theme.primary, marginTop: Spacing.four }]}>
                PANDAL SERVICES & SUPPORT (पंडाल सेवा व मदत)
              </ThemedText>
              <View style={styles.emergencyCardContainer}>
                {/* MSEB Emergency Call */}
                <Pressable
                  style={styles.emergencyRow}
                  onPress={() => Linking.openURL('tel:1912')}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flex: 1 }}>
                    <Ionicons name="flash-outline" size={18} color="#EF4444" />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontSize: 13, fontWeight: '600' }}>
                        MSEB / MSEDCL Electricity Help (महावितरण)
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Call Toll-Free: 1912
                      </ThemedText>
                    </View>
                  </View>
                  <Ionicons name="call-outline" size={16} color={theme.primary} />
                </Pressable>
              </View>
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(21, 29, 48, 0.4)' : 'rgba(255, 255, 255, 0.4)',
    padding: Spacing.three,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)',
  },
  welcomeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.primary,
    marginTop: 2,
  },
  roleContainer: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.03)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  quickAccessRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  quickAccessTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.four,
    borderRadius: 18,
    borderWidth: 1,
  },
  settingsButton: {
    padding: Spacing.two + 2,
    borderRadius: 12,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: 12,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
  },
  countdownCard: {
    padding: Spacing.three,
    borderRadius: 20,
    marginBottom: Spacing.four,
    backgroundColor: theme.primaryLight,
    borderWidth: 1,
    borderColor: theme.primaryBorder,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  countdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countdownTextContainer: {
    flex: 1,
  },
  countdownTitle: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: theme.activeTheme === 'dark' ? '#FFAB91' : '#D84315',
    fontWeight: '800',
  },
  countdownSub: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.activeTheme === 'dark' ? theme.text : theme.primaryDark,
    marginTop: 2,
  },
  emojiContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    backgroundColor: theme.activeTheme === 'dark' ? '#311B1B' : '#FFEBEE',
    padding: Spacing.three,
    borderRadius: 16,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? '#5A2A2A' : '#FFCDD2',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 10,
    marginTop: Spacing.two,
  },
  ipText: {
    fontSize: 10,
    color: theme.textSecondary,
    marginTop: Spacing.two,
  },
  loaderContainer: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  dashboardContent: {
    gap: Spacing.four,
  },
  statsContainer: {
    gap: Spacing.three,
  },
  mainCard: {
    padding: Spacing.four,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: theme.activeTheme === 'dark' ? 0.2 : 0.06,
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: theme.primaryBorder,
  },
  mainCardLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  mainBalance: {
    fontSize: 38,
    fontWeight: '900',
    color: theme.primary,
    marginVertical: Spacing.one,
    letterSpacing: -0.5,
    lineHeight: 46,
  },
  cardSeparator: {
    height: 1,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
    width: '100%',
    marginVertical: Spacing.two,
  },
  memberCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: Spacing.one,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  gridCard: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.04)',
  },
  gridCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  collectionGridCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  expenseGridCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  collectionValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981',
  },
  expenseValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#EF4444',
  },
  badgeContainer: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  badgeText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '800',
  },
  targetCard: {
    padding: Spacing.three,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.04)',
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.06)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '800',
    color: theme.textSecondary,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.04)',
  },
  actionLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: Spacing.two,
    fontWeight: '700',
  },
  emptyFeed: {
    padding: Spacing.five,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.04)',
  },
  feedList: {
    gap: Spacing.two,
  },
  feedCard: {
    padding: Spacing.three + 2,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.04)',
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedMain: {
    flex: 1,
  },
  feedTitleText: {
    fontWeight: '700',
  },
  feedSub: {
    fontSize: 11,
    marginTop: 3,
  },
  feedAmountContainer: {
    alignItems: 'flex-end',
  },
  feedAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  feedDate: {
    fontSize: 10,
    opacity: 0.8,
    marginTop: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.four,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(226, 232, 240, 0.8)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
    paddingBottom: Spacing.three,
  },
  modalTitle: {
    fontWeight: '800',
  },
  modalCloseButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15, 23, 42, 0.05)',
  },
  modalScroll: {
    paddingBottom: Spacing.six,
  },
  modalSectionTitle: {
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '800',
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  optionsContainer: {
    gap: Spacing.two,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three + 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.08)',
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.01)' : 'rgba(15, 23, 42, 0.01)',
  },
  modalSeparator: {
    height: 1,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
    marginVertical: Spacing.four,
  },
  connectionCard: {
    padding: Spacing.three + 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModalContent: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 24,
    padding: Spacing.four,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(226, 232, 240, 0.8)',
    backgroundColor: theme.activeTheme === 'dark' ? '#151d30' : '#ffffff',
  },
  confirmIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: Spacing.two,
    textAlign: 'center',
  },
  confirmSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.four,
    paddingHorizontal: Spacing.two,
  },
  confirmActions: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.three,
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15, 23, 42, 0.05)',
  },
  cancelButtonText: {
    fontWeight: '700',
    fontSize: 14,
  },
  logoutConfirmButton: {
    backgroundColor: '#EF4444',
  },
  logoutConfirmButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  crowdCard: {
    padding: Spacing.four,
    borderRadius: 20,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.04)',
  },
  crowdHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },

  weatherCard: {
    padding: Spacing.four,
    borderRadius: 20,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.04)',
  },
  weatherHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  weatherTempText: {
    fontSize: 22,
    fontWeight: '800',
  },
  weatherStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherStatCol: {
    flex: 1,
  },
  weatherStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  weatherStatDivider: {
    width: 1,
    height: '100%',
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
    marginHorizontal: Spacing.two,
  },
  weatherAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyCardContainer: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.one,
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
});
