import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Pressable, ScrollView, View, ActivityIndicator, TextInput, Modal, RefreshControl, Platform, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/context/SettingsContext';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export default function CollectionsScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const { occasionConfig } = useSettings();
  const isAdmin = user?.role === 'admin' || user?.role === 'treasurer' || user?.designation?.toLowerCase() === 'treasurer';
  const viewRef = useRef<View>(null);
  
  // State
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);

  // New Collection Form State
  const [donorName, setDonorName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('Member Contribution');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isFormNameFocused, setIsFormNameFocused] = useState(false);
  const [isFormAmountFocused, setIsFormAmountFocused] = useState(false);
  const [isFormNotesFocused, setIsFormNotesFocused] = useState(false);

  const loadCollections = async (showRefresher = false) => {
    if (showRefresher) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await api.getCollections();
      setCollections(data ?? []);
    } catch (e: any) {
      console.error(e);
      setError('Failed to load collections. Verify server connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const handleAddCollection = async () => {
    if (!donorName.trim() || !amount.trim()) {
      setFormError('Please fill in Donor Name and Amount');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid amount greater than 0');
      return;
    }

    setFormError(null);
    setFormSubmitting(true);

    try {
      const newCol = await api.createCollection({
        donorName: donorName.trim(),
        amount: parsedAmount,
        type,
        paymentMode,
        notes: notes.trim()
      });

      // Clear Form & Close Modal
      setDonorName('');
      setAmount('');
      setType('Member Contribution');
      setPaymentMode('UPI');
      setNotes('');
      setIsAddModalVisible(false);

      // Reload list and show the receipt of the newly created item!
      await loadCollections();
      setSelectedReceipt(newCol);
    } catch (e: any) {
      setFormError(e.message || 'Failed to record donation');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteCollection = async (id: number) => {
    try {
      await api.deleteCollection(id);
      setSelectedReceipt(null);
      loadCollections();
    } catch (e) {
      alert('Failed to delete collection');
    }
  };

  const handleShareReceipt = async () => {
    try {
      if (!selectedReceipt) return;
      
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1.0,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Share Receipt ${selectedReceipt.receiptNo}`,
          UTI: 'public.png',
        });
      } else {
        alert('Sharing is not available on this platform.');
      }
    } catch (e: any) {
      console.error(e);
      alert('Failed to generate receipt image: ' + e.message);
    }
  };

  const filteredCollections = collections.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      (item.donor_name ?? '').toLowerCase().includes(q) ||
      (item.type ?? '').toLowerCase().includes(q) ||
      (item.payment_mode ?? '').toLowerCase().includes(q) ||
      (item.notes ?? '').toLowerCase().includes(q)
    );
  });

  const formatRupees = (amt: number) => `₹${amt.toLocaleString('en-IN')}`;
  const styles = getStyles(theme);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText type="subtitle" style={styles.title}>Collections</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Track donations and contributions
            </ThemedText>
          </View>

          <Pressable 
            style={({ pressed }) => [styles.addButton, pressed && styles.buttonPressed]} 
            onPress={() => setIsAddModalVisible(true)}
          >
            <ThemedText type="smallBold" style={styles.addButtonText}>+ Record Donation</ThemedText>
          </Pressable>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchWrapper, isSearchFocused && styles.searchWrapperFocused]}>
            <Ionicons name="search-outline" size={18} color={isSearchFocused ? theme.primary : theme.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search by Donor Name, Receipt No..."
              placeholderTextColor={theme.textSecondary + '70'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Loader or Error */}
        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={{ marginTop: Spacing.two }}>Loading collections...</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Pressable style={styles.retryButton} onPress={() => loadCollections()}>
              <ThemedText type="smallBold" style={{ color: '#fff' }}>Retry</ThemedText>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadCollections(true)} tintColor={theme.primary} />
            }
            showsVerticalScrollIndicator={false}
          >
            {filteredCollections.length === 0 ? (
              <ThemedView type="backgroundElement" style={styles.emptyView}>
                <Ionicons name="wallet-outline" size={44} color={theme.primary} style={{ marginBottom: Spacing.two }} />
                <ThemedText type="smallBold" themeColor="textSecondary">
                  No donations found
                </ThemedText>
                <ThemedText type="code" themeColor="textSecondary" style={{ marginTop: Spacing.one, textAlign: 'center' }}>
                  Verify your filters or tap "+ Record Donation" to log a contribution.
                </ThemedText>
              </ThemedView>
            ) : (
              <View style={styles.listContainer}>
                {filteredCollections.map(item => (
                  <Pressable 
                    key={item.id} 
                    onPress={() => setSelectedReceipt(item)}
                    style={({ pressed }) => [styles.pressableCard, pressed && { opacity: 0.95 }]}
                  >
                    <ThemedView type="backgroundElement" style={styles.card}>
                      <View style={styles.cardRow}>
                        <View style={styles.cardInfo}>
                          <View style={styles.receiptHeader}>
                            <ThemedText type="code" style={styles.receiptNo}>
                              {item.receipt_no ?? '—'}
                            </ThemedText>
                            <ThemedView style={styles.typeBadge} type="backgroundSelected">
                              <ThemedText type="code" style={styles.typeBadgeText}>
                                {item.type}
                              </ThemedText>
                            </ThemedView>
                          </View>
                          <ThemedText type="default" style={styles.donorName}>
                            {item.donor_name}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary" style={styles.collectedBy}>
                            Collected by: {item.collected_by || 'Mandal'}
                          </ThemedText>
                        </View>
                        <View style={styles.amountContainer}>
                          <ThemedText type="smallBold" style={styles.amountText}>
                            {formatRupees(item.amount)}
                          </ThemedText>
                          <ThemedText type="code" style={styles.dateText}>
                            {new Date(item.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short'
                            })}
                          </ThemedText>
                        </View>
                      </View>
                    </ThemedView>
                  </Pressable>
                ))}
              </View>
            )}
            <View style={{ height: BottomTabInset + Spacing.six }} />
          </ScrollView>
        )}

        {/* ================= ADD COLLECTION MODAL ================= */}
        <Modal
          visible={isAddModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsAddModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView type="backgroundElement" style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle" style={styles.modalTitle}>Record Donation</ThemedText>
                <Pressable onPress={() => setIsAddModalVisible(false)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </Pressable>
              </View>

              {formError && (
                <View style={styles.formErrorBox}>
                  <ThemedText style={styles.formErrorText}>{formError}</ThemedText>
                </View>
              )}

              <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.label}>Donor Full Name *</ThemedText>
                  <TextInput
                    style={[styles.input, isFormNameFocused && styles.inputFocused, { color: theme.text }]}
                    placeholder="Enter donor/member name"
                    placeholderTextColor={theme.textSecondary + '70'}
                    value={donorName}
                    onChangeText={setDonorName}
                    onFocus={() => setIsFormNameFocused(true)}
                    onBlur={() => setIsFormNameFocused(false)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.label}>Contribution Amount (₹) *</ThemedText>
                  <TextInput
                    style={[styles.input, isFormAmountFocused && styles.inputFocused, { color: theme.text }]}
                    placeholder="Enter amount"
                    placeholderTextColor={theme.textSecondary + '70'}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                    onFocus={() => setIsFormAmountFocused(true)}
                    onBlur={() => setIsFormAmountFocused(false)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.label}>Contribution Type</ThemedText>
                  <View style={styles.radioRow}>
                    {['Member Contribution', 'Public Donation', 'Sponsorship'].map(t => {
                      const isActive = type === t;
                      return (
                        <Pressable
                          key={t}
                          style={[
                            styles.radio, 
                            isActive && { backgroundColor: theme.primaryLight, borderColor: theme.primary }
                          ]}
                          onPress={() => setType(t)}
                        >
                          <ThemedText 
                            type="code" 
                            style={[
                              styles.radioLabel, 
                              isActive && { color: theme.primary, fontWeight: '800' }
                            ]}
                          >
                            {t.split(' ')[0]}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.label}>Payment Mode</ThemedText>
                  <View style={styles.radioRow}>
                    {['UPI', 'Cash', 'Bank Transfer'].map(m => {
                      const isActive = paymentMode === m;
                      return (
                        <Pressable
                          key={m}
                          style={[
                            styles.radio, 
                            isActive && { backgroundColor: theme.primaryLight, borderColor: theme.primary }
                          ]}
                          onPress={() => setPaymentMode(m)}
                        >
                          <ThemedText 
                            type="code" 
                            style={[
                              styles.radioLabel, 
                              isActive && { color: theme.primary, fontWeight: '800' }
                            ]}
                          >
                            {m}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.label}>Notes / Reference</ThemedText>
                  <TextInput
                    style={[styles.input, isFormNotesFocused && styles.inputFocused, { height: 70, textAlignVertical: 'top', color: theme.text }]}
                    placeholder="Reference ID or special details..."
                    placeholderTextColor={theme.textSecondary + '70'}
                    multiline
                    value={notes}
                    onChangeText={setNotes}
                    onFocus={() => setIsFormNotesFocused(true)}
                    onBlur={() => setIsFormNotesFocused(false)}
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.submitButton,
                    pressed && styles.buttonPressed,
                    formSubmitting && styles.buttonDisabled,
                  ]}
                  onPress={handleAddCollection}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.submitButtonText}>Generate Receipt & Save</ThemedText>
                  )}
                </Pressable>
              </ScrollView>
            </ThemedView>
          </View>
        </Modal>

        {/* ================= DIGITAL RECEIPT MODAL ================= */}
        <Modal
          visible={selectedReceipt !== null}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setSelectedReceipt(null)}
        >
          <View style={styles.receiptOverlay}>
            <ScrollView 
              style={{ width: '100%' }}
              contentContainerStyle={styles.receiptScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.receiptContainer}>
                {/* Receipt Frame */}
                <View 
                  ref={viewRef}
                  style={[styles.receiptCard, { borderColor: theme.primary, backgroundColor: '#FFFDE7' }]}
                  collapsable={false}
                >
                  {/* Traditional Ganesha Header */}
                  <View style={styles.receiptHeaderBorder}>
                    <ThemedText style={{ fontSize: 32, lineHeight: 40, marginBottom: 4, textAlign: 'center' }}>{occasionConfig.emoji}</ThemedText>
                    <ThemedText style={[styles.receiptMandalName, { color: theme.primaryDark }]}>साईप्रसाद कला, क्रीडा व सांस्कृतिक मित्र मंडळ</ThemedText>
                    <ThemedText style={[styles.receiptSubName, { color: theme.primaryDark }]}>{occasionConfig.subtitle}</ThemedText>
                    <ThemedText style={styles.receiptTagline}>Registration No: MAH/PUN/2026/G-9</ThemedText>
                  </View>

                  <View style={[styles.receiptDivider, { borderColor: theme.primary }]} />

                  {/* Receipt Metadata */}
                  <View style={styles.receiptMetaRow}>
                    <View>
                      <ThemedText style={styles.receiptMetaLabel}>RECEIPT NO</ThemedText>
                      <ThemedText style={styles.receiptMetaVal}>{selectedReceipt?.receipt_no ?? '—'}</ThemedText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <ThemedText style={styles.receiptMetaLabel}>DATE</ThemedText>
                      <ThemedText style={styles.receiptMetaVal}>
                         {selectedReceipt ? new Date(selectedReceipt.date).toLocaleDateString('en-IN') : ''}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Main Receipt Body */}
                  <View style={styles.receiptMainBody}>
                    <ThemedText style={styles.bodyIntro}>Received with thanks from:</ThemedText>
                    <ThemedText style={[styles.donorMainName, { color: theme.primaryDark, textDecorationColor: theme.primary }]}>{selectedReceipt?.donor_name}</ThemedText>

                    <View style={styles.receiptFieldRow}>
                      <ThemedText style={styles.fieldLabel}>Towards:</ThemedText>
                      <ThemedText style={styles.fieldVal}>{selectedReceipt?.type}</ThemedText>
                    </View>

                    <View style={styles.receiptFieldRow}>
                      <ThemedText style={styles.fieldLabel}>Payment Mode:</ThemedText>
                      <ThemedText style={styles.fieldVal}>{selectedReceipt?.payment_mode}</ThemedText>
                    </View>

                    {selectedReceipt?.notes ? (
                      <View style={styles.receiptFieldRow}>
                        <ThemedText style={styles.fieldLabel}>Remarks:</ThemedText>
                        <ThemedText style={styles.fieldVal}>{selectedReceipt?.notes}</ThemedText>
                      </View>
                    ) : null}
                  </View>

                  {/* Big Amount Stamp */}
                  <View style={styles.receiptAmountStamp}>
                    <ThemedText style={styles.amountStampLabel}>AMOUNT RECEIVED</ThemedText>
                    <ThemedText style={styles.amountStampVal}>
                      {selectedReceipt ? formatRupees(selectedReceipt.amount) : ''}
                    </ThemedText>
                  </View>

                  {/* Footer Stamp */}
                  <View style={styles.receiptFooterRow}>
                    <View>
                      <ThemedText style={styles.receiptCollectedByLabel}>Collected by</ThemedText>
                      <ThemedText style={styles.receiptCollectedByVal}>{selectedReceipt?.collected_by || 'Mandal Board'}</ThemedText>
                    </View>
                    <View style={[styles.stampLogo, { borderColor: theme.primary }]}>
                      <ThemedText style={{ fontSize: 18, lineHeight: 22, textAlign: 'center' }}>{occasionConfig.emoji}</ThemedText>
                      <ThemedText style={[styles.stampText, { color: theme.primaryDark }]}>Mandal Board</ThemedText>
                    </View>
                  </View>

                  <ThemedText style={[styles.thankYouNote, { color: theme.primaryDark }]}>
                    "May Lord Ganesha bless you with health, wealth and wisdom!"
                  </ThemedText>
                </View>

                {/* Receipt Control Buttons */}
                <View style={styles.receiptControlsContainer}>
                  <View style={styles.receiptMainControls}>
                    <Pressable
                      style={[styles.closeReceiptButton, { backgroundColor: theme.primary }]}
                      onPress={() => setSelectedReceipt(null)}
                    >
                      <ThemedText style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Close</ThemedText>
                    </Pressable>

                    <Pressable
                      style={styles.whatsappReceiptButton}
                      onPress={handleShareReceipt}
                    >
                      <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                      <ThemedText style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Send Receipt</ThemedText>
                    </Pressable>
                  </View>

                  {isAdmin && (
                    <Pressable
                      style={styles.deleteReceiptButtonFull}
                      onPress={() => setIsDeleteConfirmVisible(true)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      <ThemedText style={styles.deleteReceiptButtonText}>Delete Entry</ThemedText>
                    </Pressable>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* ===== DELETE CONFIRMATION MODAL ===== */}
        <Modal
          visible={isDeleteConfirmVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsDeleteConfirmVisible(false)}
        >
          <View style={styles.deleteConfirmOverlay}>
            <ThemedView type="backgroundElement" style={styles.deleteConfirmContent}>
              <View style={styles.deleteConfirmIconContainer}>
                <Ionicons name="trash-outline" size={30} color="#EF4444" />
              </View>

              <ThemedText type="subtitle" style={styles.deleteConfirmTitle}>
                Delete Entry?
              </ThemedText>

              <ThemedText style={styles.deleteConfirmSubtitle} themeColor="textSecondary">
                This will permanently remove this collection record. This action cannot be undone.
              </ThemedText>

              <View style={styles.deleteConfirmActions}>
                <Pressable
                  style={[styles.deleteConfirmButton, styles.deleteConfirmCancel]}
                  onPress={() => setIsDeleteConfirmVisible(false)}
                >
                  <ThemedText style={styles.deleteConfirmCancelText}>Cancel</ThemedText>
                </Pressable>

                <Pressable
                  style={[styles.deleteConfirmButton, styles.deleteConfirmDelete]}
                  onPress={() => {
                    setIsDeleteConfirmVisible(false);
                    handleDeleteCollection(selectedReceipt.id);
                  }}
                >
                  <Ionicons name="trash-outline" size={15} color="#fff" />
                  <ThemedText style={styles.deleteConfirmDeleteText}>Delete</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </View>
        </Modal>
      </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  title: {
    fontWeight: '800',
    color: theme.primary,
    fontSize: 22,
  },
  addButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
    backgroundColor: theme.primaryDark,
  },
  searchContainer: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15, 23, 42, 0.03)',
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15, 23, 42, 0.08)',
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
  },
  searchWrapperFocused: {
    borderColor: theme.primary,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255, 87, 34, 0.02)' : 'rgba(255, 87, 34, 0.01)',
  },
  searchInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  errorContainer: {
    padding: Spacing.four,
    alignItems: 'center',
  },
  errorText: {
    color: '#E53935',
    textAlign: 'center',
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#E53935',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 10,
    marginTop: Spacing.two,
  },
  emptyView: {
    padding: Spacing.six,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: Spacing.four,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.04)',
  },
  listContainer: {
    gap: Spacing.two,
  },
  pressableCard: {
    width: '100%',
  },
  card: {
    padding: Spacing.three + 2,
    borderRadius: 20,
    shadowColor: theme.activeTheme === 'dark' ? '#000' : '#475569',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.activeTheme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.04)',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  receiptNo: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.primary,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 9,
    opacity: 0.85,
    fontWeight: '700',
  },
  donorName: {
    fontSize: 16,
    fontWeight: '800',
  },
  collectedBy: {
    fontSize: 11,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 17,
    color: '#10B981',
    fontWeight: '800',
  },
  dateText: {
    fontSize: 10,
    opacity: 0.7,
    marginTop: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.four,
    maxHeight: '90%',
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
    color: theme.primary,
  },
  modalCloseButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15, 23, 42, 0.05)',
  },
  formErrorBox: {
    backgroundColor: theme.activeTheme === 'dark' ? '#311B1B' : '#FFEBEE',
    padding: Spacing.two,
    borderRadius: 10,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? '#5A2A2A' : '#FFCDD2',
  },
  formErrorText: {
    color: '#E53935',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
  },
  formScroll: {
    marginBottom: Spacing.four,
  },
  label: {
    marginBottom: Spacing.one,
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: Spacing.three,
  },
  input: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)',
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Platform.OS === 'ios' ? 13 : 11,
    fontSize: 15,
    marginTop: 4,
  },
  inputFocused: {
    borderColor: theme.primary,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255, 87, 34, 0.03)' : 'rgba(255, 87, 34, 0.01)',
  },
  radioRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: 6,
  },
  radio: {
    flex: 1,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15, 23, 42, 0.02)',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
  },
  radioLabel: {
    fontSize: 11,
    opacity: 0.85,
  },
  submitButton: {
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.three,
    marginBottom: Spacing.six,
    backgroundColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  // Digital Receipt
  receiptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  receiptContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  receiptCard: {
    width: '100%',
    backgroundColor: '#FFFDE7', 
    borderRadius: 24,
    padding: Spacing.four,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  receiptHeaderBorder: {
    alignItems: 'center',
    paddingBottom: Spacing.two,
  },
  receiptMandalName: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: Spacing.one,
    lineHeight: 26,
  },
  receiptSubName: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 2,
  },
  receiptTagline: {
    fontSize: 8,
    color: '#555',
    marginTop: 4,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  receiptDivider: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginVertical: Spacing.two,
  },
  receiptMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  receiptMetaLabel: {
    fontSize: 9,
    color: '#555',
    fontWeight: '700',
  },
  receiptMetaVal: {
    fontSize: 12,
    color: '#000',
    fontWeight: '800',
  },
  receiptMainBody: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  bodyIntro: {
    fontSize: 12,
    color: '#555',
    fontStyle: 'italic',
  },
  donorMainName: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    textDecorationLine: 'underline',
    marginBottom: Spacing.two,
  },
  receiptFieldRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: 'rgba(245,127,23,0.3)',
    paddingVertical: 5,
  },
  fieldLabel: {
    width: 100,
    fontSize: 12,
    color: '#444',
    fontWeight: '700',
  },
  fieldVal: {
    flex: 1,
    fontSize: 12,
    color: '#000',
    fontWeight: '800',
  },
  receiptAmountStamp: {
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#4CAF50',
    padding: Spacing.two,
    alignItems: 'center',
    marginVertical: Spacing.two,
  },
  amountStampLabel: {
    fontSize: 9,
    color: '#2E7D32',
    fontWeight: '800',
    letterSpacing: 1,
  },
  amountStampVal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2E7D32',
    marginTop: 2,
  },
  receiptFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: Spacing.three,
  },
  receiptCollectedByLabel: {
    fontSize: 9,
    color: '#555',
    fontWeight: '600',
  },
  receiptCollectedByVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111',
  },
  stampLogo: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 50,
    width: 68,
    height: 68,
    backgroundColor: 'rgba(255,255,255,0.85)',
    transform: [{ rotate: '-12deg' }],
  },
  stampText: {
    fontSize: 7.5,
    fontWeight: '800',
    marginTop: 1,
  },
  thankYouNote: {
    fontSize: 9,
    textAlign: 'center',
    fontWeight: '700',
    marginTop: Spacing.four,
    fontStyle: 'italic',
  },
  receiptScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  receiptControlsContainer: {
    width: '100%',
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  receiptMainControls: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.three,
  },
  closeReceiptButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  whatsappReceiptButton: {
    flex: 1,
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  deleteReceiptButtonFull: {
    width: '100%',
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.one,
  },
  deleteReceiptButtonText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 14,
  },
  deleteConfirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteConfirmContent: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 24,
    padding: Spacing.four,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(226, 232, 240, 0.8)',
    backgroundColor: theme.activeTheme === 'dark' ? '#151d30' : '#ffffff',
  },
  deleteConfirmIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  deleteConfirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: Spacing.two,
    textAlign: 'center',
  },
  deleteConfirmSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.four,
    paddingHorizontal: Spacing.two,
  },
  deleteConfirmActions: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.three,
  },
  deleteConfirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  deleteConfirmCancel: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15, 23, 42, 0.05)',
  },
  deleteConfirmCancelText: {
    fontWeight: '700',
    fontSize: 14,
  },
  deleteConfirmDelete: {
    backgroundColor: '#EF4444',
  },
  deleteConfirmDeleteText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
