import React, { useState, useEffect } from 'react';
import { StyleSheet, Pressable, ScrollView, View, ActivityIndicator, TextInput, Modal, RefreshControl, Platform, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ExpensesScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const isAdmin = true;

  // State
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('All'); // All, Verified, Pending

  // Add Expense Modal Form
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Expense Detail Modal
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  const [isFormTitleFocused, setIsFormTitleFocused] = useState(false);
  const [isFormAmountFocused, setIsFormAmountFocused] = useState(false);
  const [isFormNotesFocused, setIsFormNotesFocused] = useState(false);
  const [isImagePickerModalVisible, setIsImagePickerModalVisible] = useState(false);

  const handlePickImage = async () => {
    try {
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();

      if (libraryStatus !== 'granted' || cameraStatus !== 'granted') {
        alert('Camera and gallery access permissions are required to upload receipts.');
        return;
      }

      if (Platform.OS === 'web') {
        const option = window.confirm("Do you want to Take Photo (OK) or Choose from Gallery (Cancel)?");
        if (option) {
          launchCamera();
        } else {
          launchImageLibrary();
        }
      } else {
        setIsImagePickerModalVisible(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const launchCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const base64 = result.assets[0].base64;
        setReceiptImage(`data:image/jpeg;base64,${base64}`);
      }
    } catch (error) {
      console.error(error);
      alert('Error launching camera');
    }
  };

  const launchImageLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const base64 = result.assets[0].base64;
        setReceiptImage(`data:image/jpeg;base64,${base64}`);
      }
    } catch (error) {
      console.error(error);
      alert('Error launching gallery');
    }
  };

  const loadExpenses = async (showRefresher = false) => {
    if (showRefresher) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await api.getExpenses();
      setExpenses(data ?? []);
    } catch (e: any) {
      console.error(e);
      setError('Failed to load expenses. Check backend connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleAddExpense = async () => {
    if (!title.trim() || !amount.trim()) {
      setFormError('Please enter Title and Amount');
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
      await api.createExpense({
        title: title.trim(),
        amount: parsedAmount,
        notes: notes.trim(),
        receiptImage
      });

      // Clear Form & Close Modal
      setTitle('');
      setAmount('');
      setNotes('');
      setReceiptImage(null);
      setIsAddModalVisible(false);

      // Reload
      loadExpenses();
    } catch (e: any) {
      setFormError(e.message || 'Failed to record expense');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleVerifyExpense = async (id: number) => {
    try {
      const updated = await api.verifyExpense(id);
      setSelectedExpense(updated);
      loadExpenses();
    } catch (e) {
      alert('Failed to verify expense');
    }
  };

  const handleDeleteExpense = async (id: number) => {
    try {
      await api.deleteExpense(id);
      setSelectedExpense(null);
      loadExpenses();
    } catch (e) {
      alert('Failed to delete expense');
    }
  };

  const filteredExpenses = expenses;

  const formatRupees = (amt: number) => `₹${amt.toLocaleString('en-IN')}`;
  const styles = getStyles(theme);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText type="subtitle" style={styles.title}>Expenses</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Mandal expenditures register
            </ThemedText>
          </View>
          <Pressable 
            style={({ pressed }) => [styles.addButton, pressed && styles.buttonPressed]} 
            onPress={() => setIsAddModalVisible(true)}
          >
            <ThemedText type="smallBold" style={styles.addButtonText}>+ Record Expense</ThemedText>
          </Pressable>
        </View>



        {/* List of expenses */}
        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={{ marginTop: Spacing.two }}>Loading expenses...</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Pressable style={styles.retryButton} onPress={() => loadExpenses()}>
              <ThemedText type="smallBold" style={{ color: '#fff' }}>Retry</ThemedText>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadExpenses(true)} tintColor={theme.primary} />
            }
            showsVerticalScrollIndicator={false}
          >
            {filteredExpenses.length === 0 ? (
              <ThemedView type="backgroundElement" style={styles.emptyView}>
                <Ionicons name="card-outline" size={44} color={theme.primary} style={{ marginBottom: Spacing.two }} />
                <ThemedText type="smallBold" themeColor="textSecondary">No expenses found</ThemedText>
                <ThemedText type="code" themeColor="textSecondary" style={{ marginTop: Spacing.one, textAlign: 'center' }}>
                  No logs match filters. Record an expense by tapping "+ Record Expense".
                </ThemedText>
              </ThemedView>
            ) : (
              <View style={styles.listContainer}>
                {filteredExpenses.map(item => (
                  <Pressable 
                    key={item.id} 
                    onPress={() => setSelectedExpense(item)}
                    onLongPress={() => {
                      setTitle(item.title || item.description || '');
                      setNotes(item.notes || '');
                      setAmount('');
                      setReceiptImage(null);
                      setIsAddModalVisible(true);
                    }}
                    delayLongPress={500}
                    style={({ pressed }) => [styles.pressableCard, pressed && { opacity: 0.95 }]}
                  >
                    <ThemedView type="backgroundElement" style={styles.card}>
                      <View style={styles.cardRow}>
                        <View style={[styles.emojiContainer, { backgroundColor: theme.primaryLight }]}>
                          <Ionicons name="receipt-outline" size={20} color={theme.primary} />
                        </View>
                        <View style={styles.cardInfo}>
                          <ThemedText type="default" style={styles.expenseTitle}>
                            {item.title || item.description}
                          </ThemedText>
                          <View style={styles.metaRow}>
                            <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>
                              Paid by: {item.paid_by || item.paidBy || 'Mandal'}
                            </ThemedText>
                          </View>

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

        {/* ================= ADD EXPENSE MODAL ================= */}
        <Modal
          visible={isAddModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsAddModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView type="backgroundElement" style={styles.modalContent}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.primaryBorder }]}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" themeColor="textSecondary">नमस्कार, {user?.name?.split(' ')[0] || 'Volunteer'} 🙏</ThemedText>
                  <ThemedText type="subtitle" style={[styles.modalTitle, { color: theme.primary }]}>Record Expense</ThemedText>
                </View>
                <Pressable onPress={() => setIsAddModalVisible(false)} style={[styles.modalCloseButton, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="close" size={22} color={theme.primary} />
                </Pressable>
              </View>

              {formError && (
                <View style={[styles.formErrorBox, { borderLeftColor: '#EF4444', borderLeftWidth: 4 }]}>
                  <Ionicons name="warning-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                  <ThemedText style={styles.formErrorText}>{formError}</ThemedText>
                </View>
              )}

              <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.label}>Expense Title / Item *</ThemedText>
                  <TextInput
                    style={[styles.input, isFormTitleFocused && styles.inputFocused, { color: theme.text }]}
                    placeholder="e.g. Stage Decoration Lights"
                    placeholderTextColor={theme.textSecondary + '70'}
                    value={title}
                    onChangeText={setTitle}
                    onFocus={() => setIsFormTitleFocused(true)}
                    onBlur={() => setIsFormTitleFocused(false)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.label}>Amount (₹) *</ThemedText>
                  <TextInput
                    style={[styles.input, isFormAmountFocused && styles.inputFocused, { color: theme.text }]}
                    placeholder="Enter amount paid"
                    placeholderTextColor={theme.textSecondary + '70'}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                    onFocus={() => setIsFormAmountFocused(true)}
                    onBlur={() => setIsFormAmountFocused(false)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.label}>Description / Notes</ThemedText>
                  <TextInput
                    style={[styles.input, isFormNotesFocused && styles.inputFocused, { height: 70, textAlignVertical: 'top', color: theme.text }]}
                    placeholder="Enter additional details like shop name or invoice number..."
                    placeholderTextColor={theme.textSecondary + '70'}
                    multiline
                    value={notes}
                    onChangeText={setNotes}
                    onFocus={() => setIsFormNotesFocused(true)}
                    onBlur={() => setIsFormNotesFocused(false)}
                  />
                </View>

                {/* Invoice/Receipt Upload */}
                <View style={styles.inputGroup}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.label}>Receipt Image Upload</ThemedText>
                  <Pressable onPress={handlePickImage}>
                    {receiptImage ? (
                      <View style={styles.uploadedContainer}>
                        <Image source={{ uri: receiptImage }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                        <View style={styles.uploadOverlayButton}>
                          <Ionicons name="camera-reverse" size={16} color="#fff" />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.simulatedUpload}>
                        <Ionicons name="camera-outline" size={28} color={theme.textSecondary} />
                        <ThemedText type="smallBold" themeColor="textSecondary" style={{ marginTop: 4 }}>
                          Upload/Capture Receipt Image
                        </ThemedText>
                      </View>
                    )}
                  </Pressable>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.submitButton, 
                    pressed && styles.buttonPressed,
                    formSubmitting && styles.buttonDisabled
                  ]}
                  onPress={handleAddExpense}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.submitButtonText}>Submit Expense Details</ThemedText>
                  )}
                </Pressable>
              </ScrollView>
            </ThemedView>
          </View>
        </Modal>

        {/* ================= EXPENSE DETAIL MODAL ================= */}
        <Modal
          visible={selectedExpense !== null}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setSelectedExpense(null)}
        >
          <View style={styles.detailOverlay}>
            <ThemedView type="backgroundElement" style={styles.detailCard}>
              <View style={[styles.detailHeader, { backgroundColor: theme.primaryLight, borderRadius: 16, marginBottom: Spacing.three, padding: Spacing.three }]}>
                <View style={[styles.detailIconCircle, { backgroundColor: theme.primary }]}>
                  <Ionicons name="receipt-outline" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" style={{ color: theme.primaryDark, fontWeight: '700' }}>व्यय (Expense Voucher)</ThemedText>
                  <ThemedText type="subtitle" style={[styles.detailCategory, { color: theme.primary }]}>Expense Details</ThemedText>
                </View>
                <Pressable onPress={() => setSelectedExpense(null)} style={[styles.modalCloseButton, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="close" size={20} color={theme.primary} />
                </Pressable>
              </View>

              <View style={styles.detailDivider} />

              <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                <ThemedText type="title" style={styles.detailTitle}>{selectedExpense?.title || selectedExpense?.description}</ThemedText>
                
                <View style={styles.detailAmountRow}>
                  <ThemedText type="small" themeColor="textSecondary" style={{ letterSpacing: 1, fontWeight: '700' }}>AMOUNT PAID</ThemedText>
                  <ThemedText style={styles.detailAmountText}>
                    {selectedExpense ? formatRupees(selectedExpense.amount) : ''}
                  </ThemedText>
                </View>

                <View style={styles.detailGrid}>
                  <View style={styles.detailGridRow}>
                    <ThemedText style={styles.detailGridLabel}>Spent by:</ThemedText>
                    <ThemedText style={styles.detailGridVal}>{selectedExpense?.paid_by || selectedExpense?.paidBy || 'Mandal Board'}</ThemedText>
                  </View>

                  <View style={styles.detailGridRow}>
                    <ThemedText style={styles.detailGridLabel}>Date:</ThemedText>
                    <ThemedText style={styles.detailGridVal}>
                      {selectedExpense ? new Date(selectedExpense.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      }) : ''}
                    </ThemedText>
                  </View>



                  {selectedExpense?.notes ? (
                    <View style={[styles.detailGridRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 4, borderBottomWidth: 0 }]}>
                      <ThemedText style={styles.detailGridLabel}>Notes / Remarks:</ThemedText>
                      <ThemedText style={styles.detailNotesText}>{selectedExpense?.notes}</ThemedText>
                    </View>
                  ) : null}
                </View>

                {/* Receipt Image */}
                <View style={styles.detailReceiptContainer}>
                  <ThemedText style={styles.detailGridLabel}>Receipt Document</ThemedText>
                  {selectedExpense?.receipt_image ? (
                    <View style={styles.docImageContainer}>
                      <Image 
                        source={{ uri: selectedExpense.receipt_image }} 
                        style={{ width: '100%', height: 220, resizeMode: 'cover' }} 
                      />
                    </View>
                  ) : (
                    <View style={styles.mockReceiptDocument}>
                      <Ionicons name="document-text-outline" size={32} color={theme.textSecondary} />
                      <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary, marginTop: 6 }}>
                        EXP-RECEIPT-{selectedExpense?.id}.JPG
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11, fontStyle: 'italic', marginTop: 2 }}>
                        (No receipt image attached)
                      </ThemedText>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.detailControls}>
                <Pressable
                  style={styles.closeDetailButton}
                  onPress={() => setSelectedExpense(null)}
                >
                  <ThemedText style={{ color: '#fff', fontWeight: '800' }}>Close</ThemedText>
                </Pressable>



                {/* Delete Action (Admins only) */}
                {isAdmin && (
                  <Pressable
                    style={styles.deleteActionButton}
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        if (window.confirm('Are you sure you want to delete this expense record?')) {
                          handleDeleteExpense(selectedExpense.id);
                        }
                      } else {
                        const { Alert } = require('react-native');
                        Alert.alert('Delete Expense', 'Are you sure you want to delete this expense record?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => handleDeleteExpense(selectedExpense.id) }
                        ]);
                      }
                    }}
                  >
                    <ThemedText style={{ color: '#fff', fontWeight: '800' }}>Delete</ThemedText>
                  </Pressable>
                )}
              </View>
            </ThemedView>
          </View>
        </Modal>

        {/* ================= IMAGE PICKER MODAL ================= */}
        <Modal
          visible={isImagePickerModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsImagePickerModalVisible(false)}
        >
          <View style={styles.detailOverlay}>
            <ThemedView type="backgroundElement" style={[styles.detailCard, { maxWidth: 320, padding: Spacing.six }]}>
              <ThemedText type="subtitle" style={{ textAlign: 'center', marginBottom: Spacing.two, color: theme.primary }}>
                Upload Receipt
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginBottom: Spacing.six }}>
                Choose an option to upload the receipt image
              </ThemedText>

              <Pressable 
                style={[styles.pickerActionButton, { backgroundColor: theme.primaryLight, borderColor: theme.primaryBorder }]} 
                onPress={() => { setIsImagePickerModalVisible(false); launchCamera(); }}
              >
                <Ionicons name="camera" size={24} color={theme.primary} />
                <ThemedText type="smallBold" style={{ color: theme.primary }}>Take a Photo</ThemedText>
              </Pressable>

              <Pressable 
                style={[styles.pickerActionButton, { backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} 
                onPress={() => { setIsImagePickerModalVisible(false); launchImageLibrary(); }}
              >
                <Ionicons name="images" size={24} color={theme.text} />
                <ThemedText type="smallBold">Choose from Gallery</ThemedText>
              </Pressable>

              <Pressable 
                style={[styles.pickerCancelButton]} 
                onPress={() => setIsImagePickerModalVisible(false)}
              >
                <ThemedText type="smallBold" themeColor="textSecondary">Cancel</ThemedText>
              </Pressable>
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
    paddingHorizontal: Spacing.four,
    paddingVertical: 10,
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
  filterSection: {
    marginBottom: Spacing.three,
  },

  statusFilters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  statusChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15, 23, 42, 0.03)',
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
  },
  statusChipText: {
    fontSize: 10,
    opacity: 0.85,
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
    borderLeftColor: '#EF4444',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  cardInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  verifiedBadge: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)',
  },
  verifiedBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
  },
  pendingBadge: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.08)',
  },
  pendingBadgeText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '800',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 17,
    color: '#EF4444',
    fontWeight: '800',
  },
  dateText: {
    fontSize: 10,
    opacity: 0.7,
    marginTop: 2,
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

  uploadedContainer: {
    marginTop: 6,
    borderRadius: 14,
    overflow: 'hidden',
    height: 125,
    borderWidth: 1.5,
    borderColor: theme.primaryBorder,
  },
  uploadOverlayButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 6,
  },
  simulatedUpload: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15, 23, 42, 0.02)',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(15, 23, 42, 0.15)',
    borderRadius: 14,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
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
  // Detail Modal styles
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  detailCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(226, 232, 240, 0.8)',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  detailIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.two,
  },
  detailCategory: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.primary,
  },
  detailDivider: {
    height: 1,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
    width: '100%',
    marginVertical: Spacing.two,
  },
  detailScroll: {
    maxHeight: 380,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: Spacing.three,
  },
  detailAmountRow: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.06)',
    borderRadius: 12,
    padding: Spacing.three,
    alignItems: 'center',
    marginVertical: Spacing.two,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.15)',
  },
  detailAmountText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#EF4444',
    marginTop: 2,
  },
  detailGrid: {
    gap: Spacing.two,
    marginVertical: Spacing.two,
  },
  detailGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
    paddingVertical: 8,
  },
  detailGridLabel: {
    fontSize: 12,
    opacity: 0.7,
    fontWeight: '600',
  },
  detailGridVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailNotesText: {
    fontSize: 12,
    lineHeight: 16,
    width: '100%',
    padding: Spacing.two + 2,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15, 23, 42, 0.03)',
    borderRadius: 8,
    marginTop: 2,
  },
  detailReceiptContainer: {
    marginTop: Spacing.three,
  },
  docImageContainer: {
    marginTop: Spacing.two,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.08)',
  },
  mockReceiptDocument: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15, 23, 42, 0.02)',
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.08)',
    borderRadius: 14,
    padding: Spacing.four,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  detailControls: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  closeDetailButton: {
    flex: 1.5,
    backgroundColor: theme.activeTheme === 'dark' ? '#232D42' : '#475569',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  verifyActionButton: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  deleteActionButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  pickerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  pickerCancelButton: {
    alignItems: 'center',
    paddingTop: Spacing.three,
    marginTop: Spacing.two,
  },
});
