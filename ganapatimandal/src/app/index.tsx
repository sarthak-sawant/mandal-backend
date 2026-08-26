import React, { useState, useEffect } from 'react';
import { StyleSheet, Pressable, ScrollView, View, ActivityIndicator, RefreshControl, Dimensions, Platform, Modal, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Path, Circle } from 'react-native-svg';
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
        .slice(0, 5);

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
  }, [serverIp]);

  const onRefresh = () => {
    loadData(true);
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

  const targetPercent = Math.min(
    Math.round((stats.totalCollections / stats.collectionTarget) * 100),
    100
  );

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
              {/* Financial Dashboard Stats */}
              <View style={styles.statsContainer}>
                {/* Main Balance Card */}
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

              {/* Progress target bar */}
              <ThemedView type="backgroundElement" style={styles.targetCard}>
                <View style={styles.targetHeader}>
                  <ThemedText type="small" themeColor="textSecondary">Collection Progress</ThemedText>
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    {targetPercent}% of {formatRupees(stats.collectionTarget)}
                  </ThemedText>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${targetPercent}%`, backgroundColor: theme.primary }]} />
                </View>
              </ThemedView>

              {/* Quick Actions */}
              <View style={styles.sectionHeaderRow}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>
                  QUICK ACTIONS
                </ThemedText>
              </View>
              <View style={styles.actionsGrid}>
                <Pressable style={styles.actionItem} onPress={() => router.push('/collections')}>
                  <View style={[styles.actionIconContainer, { backgroundColor: theme.activeTheme === 'dark' ? '#112F24' : '#E8F5E9' }]}>
                    <Ionicons name="cash-outline" size={24} color="#10B981" />
                  </View>
                  <ThemedText type="smallBold" style={styles.actionLabel}>Add Collection</ThemedText>
                </Pressable>

                <Pressable style={styles.actionItem} onPress={() => router.push('/expenses')}>
                  <View style={[styles.actionIconContainer, { backgroundColor: theme.activeTheme === 'dark' ? '#3B1717' : '#FFEBEE' }]}>
                    <Ionicons name="card-outline" size={24} color="#EF4444" />
                  </View>
                  <ThemedText type="smallBold" style={styles.actionLabel}>Add Expense</ThemedText>
                </Pressable>

                <Pressable style={styles.actionItem} onPress={() => router.push('/explore')}>
                  <View style={[styles.actionIconContainer, { backgroundColor: theme.primaryLight }]}>
                    <Ionicons name="people-outline" size={24} color={theme.primary} />
                  </View>
                  <ThemedText type="smallBold" style={styles.actionLabel}>Mandal Hub</ThemedText>
                </Pressable>

                <Pressable style={styles.actionItem} onPress={onRefresh}>
                  <View style={[styles.actionIconContainer, { backgroundColor: theme.activeTheme === 'dark' ? '#212A3E' : '#ECEFF1' }]}>
                    <Ionicons name="refresh-outline" size={24} color={theme.activeTheme === 'dark' ? '#94A3B8' : '#455A64'} />
                  </View>
                  <ThemedText type="smallBold" style={styles.actionLabel}>Refresh Board</ThemedText>
                </Pressable>
              </View>

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
                              {isExpense ? item.title : `Donation: ${item.donorName}`}
                            </ThemedText>
                            <ThemedText type="code" style={styles.feedSub} themeColor="textSecondary">
                              {isExpense ? `Paid by ${item.paidBy}` : `${item.type} • ${item.paymentMode}`}
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

              {/* Connection Status */}
              <ThemedText type="smallBold" style={[styles.modalSectionTitle, { color: theme.primary }]}>
                SERVER CONNECTION
              </ThemedText>
              <ThemedView style={styles.connectionCard} type="background">
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <ThemedText type="small">Server Host:</ThemedText>
                  <ThemedText type="smallBold" style={{ color: theme.text }}>{serverIp}</ThemedText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <ThemedText type="small">Connection Status:</ThemedText>
                  <ThemedText type="smallBold" style={{ color: '#10B981' }}>Connected</ThemedText>
                </View>
              </ThemedView>
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
});
