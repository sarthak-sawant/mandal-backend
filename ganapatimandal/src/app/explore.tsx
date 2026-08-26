import React, { useState, useEffect } from 'react';
import { StyleSheet, Pressable, ScrollView, View, ActivityIndicator, TextInput, Modal, RefreshControl, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/context/SettingsContext';

type HubSection = 'members' | 'inventory' | 'reports';

export default function HubScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const { occasionConfig } = useSettings();
  const isAdmin = true;

  // Navigation Hub Tab state
  const [activeSection, setActiveSection] = useState<HubSection>('members');

  // Directory Data
  const [members, setMembers] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);

  // States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search Inventory
  const [searchInv, setSearchInv] = useState('');

  // Modals
  const [isAddInvModalVisible, setIsAddInvModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Edit Member Role form
  const [newDesignation, setNewDesignation] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'member' | 'treasurer'>('member');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [memberSubmitting, setMemberSubmitting] = useState(false);

  // New Inventory form
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [status, setStatus] = useState('Available');
  const [location, setLocation] = useState('');
  const [invError, setInvError] = useState<string | null>(null);
  const [invSubmitting, setInvSubmitting] = useState(false);

  // Text inputs focus state
  const [isSearchInvFocused, setIsSearchInvFocused] = useState(false);
  const [isFormItemFocused, setIsFormItemFocused] = useState(false);
  const [isFormQtyFocused, setIsFormQtyFocused] = useState(false);
  const [isFormLocFocused, setIsFormLocFocused] = useState(false);
  const [isNewDesignationFocused, setIsNewDesignationFocused] = useState(false);

  const loadHubData = async (showRefresher = false) => {
    if (showRefresher) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [membersData, inventoryData, statsData, expensesData, collectionsData] = await Promise.all([
        api.getMembers(),
        api.getInventory(),
        api.getDashboardStats(),
        api.getExpenses(),
        api.getCollections()
      ]);

      setMembers(membersData);
      setInventory(inventoryData);
      setStats(statsData);
      setExpenses(expensesData);
      setCollections(collectionsData);
    } catch (e: any) {
      console.error(e);
      setError('Could not retrieve hub directories. Verify connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHubData();
  }, []);

  const handleUpdateMember = async () => {
    if (!selectedMember) return;
    if (!newDesignation.trim()) {
      alert('Designation cannot be empty');
      return;
    }

    setMemberSubmitting(true);
    try {
      await api.updateMemberRole(selectedMember.id, newRole, newDesignation.trim());
      setSelectedMember(null);
      setShowRoleDropdown(false);
      loadHubData();
    } catch (e: any) {
      alert('Failed to update volunteer details');
    } finally {
      setMemberSubmitting(false);
    }
  };

  const handleAddInventory = async () => {
    if (!itemName.trim() || !quantity.trim() || !location.trim()) {
      setInvError('Please fill in Item Name, Quantity, and Storage Location');
      return;
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty < 0) {
      setInvError('Quantity must be a positive integer');
      return;
    }

    setInvError(null);
    setInvSubmitting(true);

    try {
      await api.createInventoryItem({
        itemName: itemName.trim(),
        quantity: parsedQty,
        status,
        location: location.trim()
      });

      setItemName('');
      setQuantity('');
      setStatus('Available');
      setLocation('');
      setIsAddInvModalVisible(false);
      loadHubData();
    } catch (e: any) {
      setInvError(e.message || 'Failed to register inventory item');
    } finally {
      setInvSubmitting(false);
    }
  };

  const handleDeleteInventory = async (id: number) => {
    try {
      await api.deleteInventoryItem(id);
      loadHubData();
    } catch (e) {
      alert('Failed to delete asset from inventory register');
    }
  };



  const handleSharePDFReport = async () => {
    if (!stats) return;
    try {
      // Chunk arrays for page breakdown safety in print
      const chunkArray = (arr: any[], size: number) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
          chunks.push(arr.slice(i, i + size));
        }
        return chunks;
      };

      // 1. Build Collections pages
      const collectionsChunks = collections && collections.length > 0 ? chunkArray(collections, 22) : [];
      const collectionsPages = collectionsChunks.length > 0 
        ? collectionsChunks.map((chunk, index) => `
            <div class="page-break"></div>
            <div class="section-title">Detailed Collections (वर्गणी जमा यादी) - Page ${index + 1} of ${collectionsChunks.length}</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 20%">Receipt No</th>
                  <th style="width: 45%">Donor Name</th>
                  <th style="width: 15%">Payment</th>
                  <th style="width: 20%; text-align: right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${chunk.map((c: any) => `
                  <tr>
                    <td class="bold text-blue">${c.receipt_no || c.receiptNo || '—'}</td>
                    <td>${c.donor_name || c.donorName || '—'}</td>
                    <td>${c.payment_mode || c.paymentMode || '—'}</td>
                    <td class="bold text-right text-green">₹${(c.amount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `).join('')
        : `
            <div class="page-break"></div>
            <div class="section-title">Detailed Collections (वर्गणी जमा यादी)</div>
            <div class="empty-state">
              <div class="empty-emoji">🌺</div>
              <div class="empty-title">जमा नोंदी उपलब्ध नाहीत / No collections recorded yet</div>
              <div class="empty-subtitle">मंडळाच्या खात्यात अजून कोणतीही जमा वर्गणी नोंदवली गेली नाही.</div>
            </div>
          `;

      // 2. Build Expenses pages
      const expensesChunks = expenses && expenses.length > 0 ? chunkArray(expenses, 20) : [];
      const expensesPages = expensesChunks.length > 0
        ? expensesChunks.map((chunk, index) => `
            <div class="page-break"></div>
            <div class="section-title">Detailed Expenses (खर्च तपशील यादी) - Page ${index + 1} of ${expensesChunks.length}</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 20%">Date</th>
                  <th style="width: 45%">Expense Details</th>
                  <th style="width: 20%">Paid By</th>
                  <th style="width: 15%; text-align: right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${chunk.map((e: any) => `
                  <tr>
                    <td>${new Date(e.date).toLocaleDateString('en-IN')}</td>
                    <td>${e.title}</td>
                    <td>${e.paid_by || e.paidBy || 'Mandal'}</td>
                    <td class="bold text-right text-red">₹${(e.amount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `).join('')
        : `
            <div class="page-break"></div>
            <div class="section-title">Detailed Expenses (खर्च तपशील यादी)</div>
            <div class="empty-state">
              <div class="empty-emoji">💸</div>
              <div class="empty-title">खर्च नोंदी उपलब्ध नाहीत / No expense entries recorded yet</div>
              <div class="empty-subtitle">मंडळाच्या खात्यातून अजून कोणताही खर्च नोंदवला गेला नाही.</div>
            </div>
          `;

      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                padding: 25px;
                color: #1e293b;
                background-color: #fff;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              .title {
                font-size: 24px;
                color: #FF5722;
                font-weight: bold;
                margin: 0 0 5px 0;
              }
              .subtitle {
                font-size: 13px;
                color: #64748b;
                margin: 0;
              }
              .divider {
                border-bottom: 2px solid #FF5722;
                margin: 15px 0;
              }
              .section-title {
                font-size: 14px;
                color: #FF5722;
                font-weight: bold;
                margin: 25px 0 10px 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              /* Dashboard stats cards */
              .stats-container {
                display: flex;
                justify-content: space-between;
                gap: 15px;
                margin-bottom: 25px;
              }
              .stat-box {
                flex: 1;
                padding: 12px;
                border-radius: 8px;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.03);
              }
              .stat-box.collections {
                background-color: #f0f9ff;
                border-left: 4px solid #0284c7;
              }
              .stat-box.expenses {
                background-color: #fef2f2;
                border-left: 4px solid #ef4444;
              }
              .stat-box.balance {
                background-color: #ecfdf5;
                border-left: 4px solid #10b981;
              }
              .stat-label {
                font-size: 10px;
                color: #64748b;
                text-transform: uppercase;
                margin-bottom: 4px;
                font-weight: 600;
              }
              .stat-value {
                font-size: 18px;
                font-weight: bold;
              }
              .text-blue { color: #0284c7; }
              .text-orange { color: #f97316; }
              .text-green { color: #10b981; }
              .text-red { color: #ef4444; }
              
              /* Table styling */
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 25px;
                font-size: 11px;
              }
              th {
                background-color: #f8fafc;
                color: #334155;
                font-weight: bold;
                text-align: left;
                padding: 8px;
                border-bottom: 2px solid #e2e8f0;
              }
              td {
                padding: 8px;
                border-bottom: 1px solid #e2e8f0;
                vertical-align: middle;
              }
              tr:nth-child(even) {
                background-color: #f8fafc;
              }
              .bold { font-weight: bold; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .subtext {
                font-size: 9px;
                color: #64748b;
              }
              
              /* Badge styling */
              .status-badge {
                padding: 2px 5px;
                border-radius: 3px;
                font-size: 8px;
                font-weight: bold;
                text-transform: uppercase;
                display: inline-block;
              }
              .status-verified {
                background-color: #d1fae5;
                color: #065f46;
              }
              .status-pending {
                background-color: #fef3c7;
                color: #92400e;
              }

              /* Category list */
              .category-container {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-bottom: 25px;
              }
              .category-card {
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 8px 12px;
                display: flex;
                flex-direction: column;
                min-width: 90px;
              }
              .cat-name {
                font-size: 9px;
                color: #64748b;
                text-transform: uppercase;
              }
              .cat-val {
                font-size: 13px;
                font-weight: bold;
                color: #334155;
                margin-top: 2px;
              }
              
              .footer {
                text-align: center;
                font-size: 10px;
                color: #94a3b8;
                margin-top: 40px;
                border-top: 1px solid #e2e8f0;
                padding-top: 15px;
              }
              .page-break {
                page-break-before: always;
              }
              tr {
                page-break-inside: avoid;
              }
              thead {
                display: table-header-group;
              }
              .empty-state {
                text-align: center;
                padding: 30px 15px;
                background-color: #f8fafc;
                border-radius: 8px;
                border: 1px dashed #cbd5e1;
                margin: 15px 0;
              }
              .empty-emoji {
                font-size: 28px;
                margin: 0 0 10px 0;
              }
              .empty-title {
                font-size: 13px;
                font-weight: bold;
                color: #475569;
                margin: 0 0 5px 0;
              }
              .empty-subtitle {
                font-size: 11px;
                color: #94a3b8;
                margin: 0;
              }
              .collections-breakdown-container {
                display: flex;
                gap: 15px;
                margin-bottom: 10px;
              }
              .breakdown-card {
                flex: 1;
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 8px 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .breakdown-label {
                font-size: 10px;
                color: #64748b;
                font-weight: 600;
                text-transform: uppercase;
              }
              .breakdown-value {
                font-size: 12px;
                font-weight: bold;
                color: #334155;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                <svg width="45" height="45" viewBox="0 0 100 100" style="margin-right: 4px;">
                  <!-- Left ear -->
                  <path d="M 40,35 C 25,35 20,45 25,55 C 30,65 40,65 40,65" fill="none" stroke="${theme.primary}" stroke-width="3" stroke-linecap="round" />
                  <!-- Right ear -->
                  <path d="M 60,35 C 75,35 80,45 75,55 C 70,65 60,65 60,65" fill="none" stroke="${theme.primary}" stroke-width="3" stroke-linecap="round" />
                  <!-- Head / Crown -->
                  <path d="M 42,25 L 50,8 L 58,25 Z" fill="${theme.primary}" />
                  <path d="M 45,28 L 50,22 L 55,28 Z" fill="${theme.primaryDark}" opacity="0.85" />
                  <path d="M 38,35 C 38,20 62,20 62,35 C 62,48 50,45 50,55" fill="none" stroke="${theme.primary}" stroke-width="4.5" stroke-linecap="round" />
                  <!-- Trunk -->
                  <path d="M 50,52 C 50,65 62,65 62,75 C 62,82 55,85 50,85 C 45,85 43,82 45,78" fill="none" stroke="${theme.primary}" stroke-width="3.5" stroke-linecap="round" />
                  <!-- Tusk / Tooth -->
                  <path d="M 46,55 L 43,58" fill="none" stroke="${theme.primary}" stroke-width="2.5" />
                  <!-- Modak -->
                  <circle cx="65" cy="75" r="3.5" fill="${theme.primaryDark}" />
                  <!-- Tilak -->
                  <path d="M 48,31 Q 50,27 52,31 Z" fill="${theme.primaryDark}" />
                  <path d="M 46,35 Q 50,33 54,35" fill="none" stroke="${theme.primary}" stroke-width="1.5" />
                </svg>
                <h1 class="title" style="margin: 0;">साईप्रसाद कला, क्रीडा व सांस्कृतिक मित्र मंडळ</h1>
              </div>
              <p class="subtitle" style="margin-top: 5px;">${occasionConfig.subtitle}</p>
            </div>
            
            <div class="divider"></div>
            
            <div class="stats-container">
              <div class="stat-box collections">
                <div class="stat-label">Total Collections (वर्गणी)</div>
                <div class="stat-value text-blue">₹${stats.totalCollections.toLocaleString('en-IN')}</div>
              </div>
              <div class="stat-box expenses">
                <div class="stat-label">Total Expenses (एकूण खर्च)</div>
                <div class="stat-value text-red">₹${stats.totalExpenses.toLocaleString('en-IN')}</div>
              </div>
              <div class="stat-box balance">
                <div class="stat-label">Net Balance (शिल्लक रक्कम)</div>
                <div class="stat-value text-green">₹${stats.balance.toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div class="section-title" style="margin-top: 15px; margin-bottom: 8px;">Collection Breakdown (वर्गणी जमा पद्धत)</div>
            <div class="collections-breakdown-container">
              ${Object.entries(stats.collectionsByType || {}).map(([type, amount]: any) => `
                <div class="breakdown-card">
                  <div class="breakdown-label">${type}</div>
                  <div class="breakdown-value">₹${amount.toLocaleString('en-IN')}</div>
                </div>
              `).join('')}
            </div>

            <div class="section-title" style="margin-top: 15px; margin-bottom: 8px;">Mandal Volunteers & Committee (मंडळ कार्यकर्ता व समिती)</div>
            ${members && members.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th style="width: 50%">Volunteer Name</th>
                    <th style="width: 25%">Role</th>
                    <th style="width: 25%">Designation</th>
                  </tr>
                </thead>
                <tbody>
                  ${members.slice(0, 10).map((m: any) => `
                    <tr>
                      <td class="bold">${m.name}</td>
                      <td><span style="text-transform: capitalize;">${m.role}</span></td>
                      <td class="bold text-blue">${m.designation || 'Volunteer'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ${members.length > 10 ? `<p style="font-size: 8px; color: #94a3b8; margin-top: 4px; text-align: right; margin-bottom: 0;">* Showing first 10 members. Total active: ${members.length}</p>` : ''}
            ` : `
              <div class="empty-state" style="padding: 15px 10px; margin: 5px 0;">
                <div class="empty-emoji" style="font-size: 20px;">👥</div>
                <div class="empty-title" style="font-size: 11px;">कार्यकर्ता नोंद उपलब्ध नाही / No volunteers recorded yet</div>
              </div>
            `}

            ${collectionsPages}
            ${expensesPages}

            <div class="footer">
              <p>${occasionConfig.whatsappFooter}</p>
              <p>Report generated on: ${new Date().toLocaleDateString('en-IN')} | Volunteers: ${stats.memberCount}</p>
            </div>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        await Print.printAsync({ html: htmlContent });
      } else {
        const { base64 } = await Print.printToFileAsync({ html: htmlContent, base64: true });
        
        if (!base64) {
          throw new Error("Could not generate PDF base64 data.");
        }

        const filename = `saiprasad_mandal_report_${Date.now()}.pdf`;
        const targetUri = `${FileSystem.cacheDirectory}${filename}`;
        
        await FileSystem.writeAsStringAsync(targetUri, base64, {
          encoding: 'base64'
        });

        await Sharing.shareAsync(targetUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Saiprasad Mandal Report PDF',
          UTI: 'com.adobe.pdf'
        });
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to generate or share report PDF: ' + err.message);
    }
  };

  const filteredInventory = inventory.filter(item => 
    (item.item_name || item.itemName || '').toLowerCase().includes(searchInv.toLowerCase()) ||
    (item.location || '').toLowerCase().includes(searchInv.toLowerCase())
  );

  const styles = getStyles(theme);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText type="subtitle" style={styles.title}>Mandal Hub</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Manage volunteers, assets, and reports
            </ThemedText>
          </View>
        </View>

        {/* Hub Navigation Tabs */}
        <View style={styles.hubTabs}>
          {(['members', 'inventory', 'reports'] as HubSection[]).map(tab => {
            const isActive = activeSection === tab;
            return (
              <Pressable
                key={tab}
                style={({ pressed }) => [
                  styles.hubTab, 
                  isActive && { backgroundColor: theme.primaryLight, borderColor: theme.primary },
                  pressed && styles.buttonPressed
                ]}
                onPress={() => setActiveSection(tab)}
              >
                <ThemedText 
                  type="smallBold" 
                  style={[
                    styles.hubTabText, 
                    isActive && { color: theme.primary, fontWeight: '800' }
                  ]}
                >
                  {tab === 'members' ? 'Volunteers' : tab === 'inventory' ? 'Inventory' : 'Reports'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Dynamic content rendering */}
        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={{ marginTop: Spacing.two }}>Loading directory...</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Pressable style={styles.retryButton} onPress={() => loadHubData()}>
              <ThemedText type="smallBold" style={{ color: '#fff' }}>Retry</ThemedText>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadHubData(true)} tintColor={theme.primary} />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* ================= VOLUNTEERS DIRECTORY ================= */}
            {activeSection === 'members' && (
              <View style={styles.sectionContainer}>
                {members.length === 0 ? (
                  <ThemedView type="backgroundElement" style={styles.emptyView}>
                    <Ionicons name="people-outline" size={44} color={theme.primary} style={{ marginBottom: Spacing.two }} />
                    <ThemedText type="smallBold" themeColor="textSecondary">No volunteer registered yet</ThemedText>
                  </ThemedView>
                ) : (
                  <View style={styles.membersList}>
                    {members.map(member => (
                      <ThemedView key={member.id} type="backgroundElement" style={styles.memberCard}>
                        <View style={styles.memberRow}>
                          <View style={[styles.memberAvatar, { backgroundColor: theme.primary }]}>
                            <ThemedText style={styles.avatarText}>
                              {member.name.charAt(0).toUpperCase()}
                            </ThemedText>
                          </View>

                          <View style={styles.memberInfo}>
                            <View style={styles.memberNameRow}>
                              <ThemedText type="default" style={styles.memberName}>
                                {member.name}
                              </ThemedText>
                              {(member.role === 'admin' || member.role === 'treasurer') && (
                                <View style={[
                                  styles.adminBadge, 
                                  member.role === 'treasurer' && { backgroundColor: theme.activeTheme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)' }
                                ]}>
                                  <ThemedText type="code" style={[
                                    styles.adminBadgeText, 
                                    member.role === 'treasurer' && { color: '#3B82F6' }
                                  ]}>
                                    {member.role.toUpperCase()}
                                  </ThemedText>
                                </View>
                              )}
                            </View>
                            <ThemedText type="code" style={styles.memberDesignation} themeColor="textSecondary">
                              {member.designation}
                            </ThemedText>
                            <ThemedText type="code" style={styles.memberPhone} themeColor="textSecondary">
                              📞 {member.phone}
                            </ThemedText>
                          </View>

                          {/* Interactive Buttons */}
                          <View style={styles.memberActions}>
                            <Pressable 
                              style={({ pressed }) => [styles.actionButton, pressed && styles.buttonPressed]}
                              onPress={() => Linking.openURL(`tel:${member.phone}`)}
                            >
                              <Ionicons name="call" size={16} color="#10B981" />
                            </Pressable>
                            
                            <Pressable 
                              style={({ pressed }) => [styles.actionButton, pressed && styles.buttonPressed]}
                              onPress={() => Linking.openURL(`sms:${member.phone}`)}
                            >
                              <Ionicons name="chatbox-ellipses" size={16} color="#3B82F6" />
                            </Pressable>

                            {/* Admins can promote/demote or edit designations of other members */}
                            {isAdmin && (
                              <Pressable 
                                style={({ pressed }) => [styles.actionButton, pressed && styles.buttonPressed]}
                                onPress={() => {
                                  setSelectedMember(member);
                                  setNewDesignation(member.designation);
                                  setNewRole(member.role);
                                }}
                              >
                                <Ionicons name="create" size={16} color={theme.primary} />
                              </Pressable>
                            )}
                          </View>
                        </View>
                      </ThemedView>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ================= INVENTORY SECTION ================= */}
            {activeSection === 'inventory' && (
              <View style={styles.sectionContainer}>
                {/* Search and Add Header */}
                <View style={styles.inventoryHeaderRow}>
                  <View style={[styles.searchWrapper, isSearchInvFocused && styles.searchWrapperFocused]}>
                    <Ionicons name="search-outline" size={18} color={isSearchInvFocused ? theme.primary : theme.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.invSearchInput, { color: theme.text }]}
                      placeholder="Search items, locations..."
                      placeholderTextColor={theme.textSecondary + '70'}
                      value={searchInv}
                      onChangeText={setSearchInv}
                      onFocus={() => setIsSearchInvFocused(true)}
                      onBlur={() => setIsSearchInvFocused(false)}
                    />
                  </View>

                  <Pressable 
                    style={({ pressed }) => [styles.addInvButton, pressed && styles.buttonPressed]}
                    onPress={() => setIsAddInvModalVisible(true)}
                  >
                    <ThemedText type="smallBold" style={{ color: '#fff' }}>+ Add Item</ThemedText>
                  </Pressable>
                </View>

                {filteredInventory.length === 0 ? (
                  <ThemedView type="backgroundElement" style={styles.emptyView}>
                    <Ionicons name="cube-outline" size={44} color={theme.primary} style={{ marginBottom: Spacing.two }} />
                    <ThemedText type="smallBold" themeColor="textSecondary">No inventory items matching filter</ThemedText>
                  </ThemedView>
                ) : (
                  <View style={styles.inventoryList}>
                    {filteredInventory.map(item => {
                      const isAvailable = item.status === 'Available';
                      const isInUse = item.status === 'In Use';
                      const statusColor = isAvailable 
                        ? (theme.activeTheme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)') 
                        : isInUse 
                          ? (theme.activeTheme === 'dark' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.08)') 
                          : (theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)');
                      
                      const textColor = isAvailable ? '#10B981' : isInUse ? '#F59E0B' : '#EF4444';

                      return (
                        <ThemedView key={item.id} type="backgroundElement" style={styles.inventoryCard}>
                          <View style={styles.invRow}>
                            <View style={styles.invMainInfo}>
                              <ThemedText type="default" style={styles.invItemName}>
                                {item.item_name || item.itemName} (Qty: {item.quantity})
                              </ThemedText>
                              <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 2 }}>
                                📍 Location: {item.location}
                              </ThemedText>
                            </View>

                            <View style={styles.invStatusCol}>
                              <View style={[styles.statusPill, { backgroundColor: statusColor }]}>
                                <ThemedText type="code" style={[styles.pillText, { color: textColor }]}>
                                  {item.status.toUpperCase()}
                                </ThemedText>
                              </View>
                              
                              {/* Admins can delete items */}
                              {isAdmin && (
                                <Pressable 
                                  style={styles.deleteInvItem}
                                  onPress={() => {
                                    if(confirm(`Delete ${item.item_name || item.itemName} from inventory?`)) {
                                      handleDeleteInventory(item.id);
                                    }
                                  }}
                                >
                                  <Ionicons name="trash" size={15} color="#EF4444" />
                                </Pressable>
                              )}
                            </View>
                          </View>
                        </ThemedView>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* ================= REPORTS SECTION ================= */}
            {activeSection === 'reports' && stats && (
              <View style={styles.sectionContainer}>
                <ThemedView type="backgroundElement" style={styles.reportSummaryCard}>
                  <Ionicons name="stats-chart" size={36} color={theme.primary} style={{ alignSelf: 'center', marginBottom: Spacing.two }} />
                  <ThemedText type="subtitle" style={styles.reportSummaryTitle}>Accounts Overview</ThemedText>
                  
                  <View style={styles.reportDivider} />

                  <View style={styles.reportDetailRow}>
                    <ThemedText style={styles.reportLabel}>Total Collections:</ThemedText>
                    <ThemedText style={[styles.reportVal, { color: '#10B981' }]}>
                      ₹{stats.totalCollections.toLocaleString('en-IN')}
                    </ThemedText>
                  </View>

                  <View style={styles.reportDetailRow}>
                    <ThemedText style={styles.reportLabel}>Total Expenditures:</ThemedText>
                    <ThemedText style={[styles.reportVal, { color: '#EF4444' }]}>
                      ₹{stats.totalExpenses.toLocaleString('en-IN')}
                    </ThemedText>
                  </View>

                  <View style={styles.reportDivider} />

                  <View style={[styles.reportDetailRow, { paddingVertical: Spacing.two }]}>
                    <ThemedText type="default" style={{ fontWeight: '800' }}>Net Balance in Hand:</ThemedText>
                    <ThemedText type="default" style={{ fontWeight: '900', color: theme.primary, fontSize: 18 }}>
                      ₹{stats.balance.toLocaleString('en-IN')}
                    </ThemedText>
                  </View>
                </ThemedView>

                {/* Categorized breakdown summaries */}
                <ThemedView type="backgroundElement" style={[styles.breakdownCard, { marginBottom: Spacing.four }]}>
                  <ThemedText type="smallBold" style={styles.breakdownTitle}>Collection Types</ThemedText>
                  {Object.entries(stats.collectionsByType).length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 4 }}>No collection stats</ThemedText>
                  ) : (
                    Object.entries(stats.collectionsByType).map(([type, amount]: any) => (
                      <View key={type} style={styles.breakdownItem}>
                        <ThemedText type="code" style={styles.breakdownItemLabel}>{type.split(' ')[0]}</ThemedText>
                        <ThemedText type="code" style={styles.breakdownItemVal}>₹{amount.toLocaleString('en-IN')}</ThemedText>
                      </View>
                    ))
                  )}
                </ThemedView>

                {/* Share Buttons */}
                <Pressable
                  style={({ pressed }) => [styles.shareReportButton, pressed && styles.buttonPressed]}
                  onPress={handleSharePDFReport}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                  <ThemedText style={styles.shareReportButtonText}>
                    Share Summary on WhatsApp
                  </ThemedText>
                </Pressable>
              </View>
            )}

            {/* Extra spacing */}
            <View style={{ height: BottomTabInset + Spacing.six }} />
          </ScrollView>
        )}

        {/* ================= EDIT MEMBER MODAL (ADMIN ONLY) ================= */}
        <Modal
          visible={selectedMember !== null}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setSelectedMember(null);
            setShowRoleDropdown(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <ThemedView type="backgroundElement" style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <ThemedText type="small" themeColor="textSecondary">Assign Authority</ThemedText>
                  <ThemedText type="subtitle" style={styles.selectedMemberName}>
                    {selectedMember?.name}
                  </ThemedText>
                </View>
                <Pressable onPress={() => {
                  setSelectedMember(null);
                  setShowRoleDropdown(false);
                }} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.label}>Designation / Role Title *</ThemedText>
                <TextInput
                  style={[styles.input, isNewDesignationFocused && styles.inputFocused, { color: theme.text }]}
                  placeholder="e.g. Treasurer, President, Volunteer"
                  placeholderTextColor={theme.textSecondary + '70'}
                  value={newDesignation}
                  onChangeText={setNewDesignation}
                  onFocus={() => setIsNewDesignationFocused(true)}
                  onBlur={() => setIsNewDesignationFocused(false)}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.label}>App Authority Level</ThemedText>
                
                {/* Custom Role Dropdown Component */}
                <Pressable 
                  style={styles.dropdownTrigger} 
                  onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                >
                  <ThemedText style={[styles.dropdownTriggerText, { color: theme.primary }]}>
                    {newRole.toUpperCase()} (Click to change)
                  </ThemedText>
                  <Ionicons name={showRoleDropdown ? "chevron-up" : "chevron-down"} size={18} color={theme.primary} />
                </Pressable>

                {showRoleDropdown && (
                  <ThemedView style={styles.dropdownOptionsContainer} type="backgroundSelected">
                    <Pressable 
                      style={[styles.dropdownOption, newRole === 'member' && { backgroundColor: theme.primaryLight }]}
                      onPress={() => {
                        setNewRole('member');
                        setShowRoleDropdown(false);
                      }}
                    >
                      <ThemedText style={newRole === 'member' ? { color: theme.primary, fontWeight: '800' } : undefined}>
                        MEMBER (Standard Access)
                      </ThemedText>
                    </Pressable>

                    <Pressable 
                      style={[styles.dropdownOption, newRole === 'admin' && { backgroundColor: theme.primaryLight }]}
                      onPress={() => {
                        setNewRole('admin');
                        setShowRoleDropdown(false);
                      }}
                    >
                      <ThemedText style={newRole === 'admin' ? { color: theme.primary, fontWeight: '800' } : undefined}>
                        ADMIN (Delete/Verify Privileges)
                      </ThemedText>
                    </Pressable>

                    <Pressable 
                      style={[styles.dropdownOption, newRole === 'treasurer' && { backgroundColor: theme.primaryLight }]}
                      onPress={() => {
                        setNewRole('treasurer');
                        setShowRoleDropdown(false);
                      }}
                    >
                      <ThemedText style={newRole === 'treasurer' ? { color: theme.primary, fontWeight: '800' } : undefined}>
                        TREASURER (Financial & Admin Access)
                      </ThemedText>
                    </Pressable>
                  </ThemedView>
                )}
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.submitButton, 
                  pressed && styles.buttonPressed,
                  memberSubmitting && styles.buttonDisabled
                ]}
                onPress={handleUpdateMember}
                disabled={memberSubmitting}
              >
                {memberSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.submitButtonText}>Update Access Privileges</ThemedText>
                )}
              </Pressable>
            </ThemedView>
          </View>
        </Modal>

        {/* ================= ADD INVENTORY ITEM MODAL ================= */}
        <Modal
          visible={isAddInvModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsAddInvModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView type="backgroundElement" style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle" style={styles.modalTitle}>Add Asset / Item</ThemedText>
                <Pressable onPress={() => setIsAddInvModalVisible(false)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </Pressable>
              </View>

              {invError && (
                <View style={styles.formErrorBox}>
                  <ThemedText style={styles.formErrorText}>{invError}</ThemedText>
                </View>
              )}

              <ScrollView style={{ marginBottom: Spacing.four }} showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.label}>Item Name *</ThemedText>
                  <TextInput
                    style={[styles.input, isFormItemFocused && styles.inputFocused, { color: theme.text }]}
                    placeholder="e.g. Speakers, Stage Carpets"
                    placeholderTextColor={theme.textSecondary + '70'}
                    value={itemName}
                    onChangeText={setItemName}
                    onFocus={() => setIsFormItemFocused(true)}
                    onBlur={() => setIsFormItemFocused(false)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.label}>Quantity Available *</ThemedText>
                  <TextInput
                    style={[styles.input, isFormQtyFocused && styles.inputFocused, { color: theme.text }]}
                    placeholder="e.g. 5"
                    placeholderTextColor={theme.textSecondary + '70'}
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={setQuantity}
                    onFocus={() => setIsFormQtyFocused(true)}
                    onBlur={() => setIsFormQtyFocused(false)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.label}>Storage Location *</ThemedText>
                  <TextInput
                    style={[styles.input, isFormLocFocused && styles.inputFocused, { color: theme.text }]}
                    placeholder="e.g. Mandal Office Room A"
                    placeholderTextColor={theme.textSecondary + '70'}
                    value={location}
                    onChangeText={setLocation}
                    onFocus={() => setIsFormLocFocused(true)}
                    onBlur={() => setIsFormLocFocused(false)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.label}>Asset Status</ThemedText>
                  <View style={styles.radioRow}>
                    {['Available', 'In Use', 'Repair'].map(s => {
                      const isActive = status === s;
                      return (
                        <Pressable
                          key={s}
                          style={[
                            styles.radio, 
                            isActive && { backgroundColor: theme.primaryLight, borderColor: theme.primary }
                          ]}
                          onPress={() => setStatus(s)}
                        >
                          <ThemedText 
                            type="code" 
                            style={[
                              styles.radioLabel, 
                              isActive && { color: theme.primary, fontWeight: '800' }
                            ]}
                          >
                            {s}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.submitButton, 
                    pressed && styles.buttonPressed,
                    invSubmitting && styles.buttonDisabled
                  ]}
                  onPress={handleAddInventory}
                  disabled={invSubmitting}
                >
                  {invSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.submitButtonText}>Register Asset</ThemedText>
                  )}
                </Pressable>
              </ScrollView>
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
  hubTabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  hubTab: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15, 23, 42, 0.03)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
  },
  hubTabText: {
    fontSize: 12,
    opacity: 0.85,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
    backgroundColor: theme.primaryDark,
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
  sectionContainer: {
    gap: Spacing.two,
  },
  emptyView: {
    padding: Spacing.six,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: Spacing.four,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.04)',
  },
  // Members List
  membersList: {
    gap: Spacing.two,
  },
  memberCard: {
    padding: Spacing.three + 2,
    borderRadius: 20,
    shadowColor: theme.activeTheme === 'dark' ? '#000' : '#475569',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.activeTheme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.04)',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '800',
  },
  adminBadge: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  adminBadgeText: {
    color: '#10B981',
    fontSize: 8,
    fontWeight: '800',
  },
  memberDesignation: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  memberPhone: {
    fontSize: 11,
    marginTop: 4,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    padding: Spacing.two,
    borderRadius: 10,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
    borderWidth: 0.5,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
  },
  inventoryHeaderRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)',
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
  },
  searchWrapperFocused: {
    borderColor: theme.primary,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255, 87, 34, 0.02)' : 'rgba(255, 87, 34, 0.01)',
  },
  invSearchInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
  },
  addInvButton: {
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  inventoryList: {
    gap: Spacing.two,
  },
  inventoryCard: {
    padding: Spacing.three + 2,
    borderRadius: 20,
    shadowColor: theme.activeTheme === 'dark' ? '#000' : '#475569',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.activeTheme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.04)',
  },
  invRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invMainInfo: {
    flex: 1,
  },
  invItemName: {
    fontSize: 15,
    fontWeight: '800',
  },
  invStatusCol: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  deleteInvItem: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
  },
  // Reports
  reportSummaryCard: {
    padding: Spacing.four,
    borderRadius: 24,
    marginBottom: Spacing.three,
    shadowColor: theme.activeTheme === 'dark' ? '#000' : '#475569',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.activeTheme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.04)',
  },
  reportSummaryTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: Spacing.one,
    textAlign: 'center',
    color: theme.primary,
  },
  reportDivider: {
    height: 1,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
    width: '100%',
    marginVertical: Spacing.three,
  },
  reportDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 5,
  },
  reportLabel: {
    fontSize: 14,
    opacity: 0.75,
    fontWeight: '600',
  },
  reportVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  breakdownCard: {
    flex: 1,
    padding: Spacing.three + 2,
    borderRadius: 20,
    shadowColor: theme.activeTheme === 'dark' ? '#000' : '#475569',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.activeTheme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.04)',
  },
  breakdownTitle: {
    fontSize: 12,
    marginBottom: Spacing.two,
    color: theme.primary,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
  },
  breakdownItemLabel: {
    fontSize: 9,
    opacity: 0.8,
    fontWeight: '600',
  },
  breakdownItemVal: {
    fontSize: 10,
    fontWeight: '700',
  },
  shareReportButton: {
    flexDirection: 'row',
    backgroundColor: '#25D366', 
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  pdfReportButton: {
    flexDirection: 'row',
    backgroundColor: theme.activeTheme === 'dark' ? '#232D42' : '#37474F', 
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  shareReportButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  // Modal Edit Member
  selectedMemberName: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
    color: theme.primary,
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
    paddingVertical: Platform.OS === 'ios' ? 13 : 11,
    fontSize: 15,
    marginTop: 4,
  },
  inputFocused: {
    borderColor: theme.primary,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255, 87, 34, 0.03)' : 'rgba(255, 87, 34, 0.01)',
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
    paddingVertical: Platform.OS === 'ios' ? 13 : 11,
    marginTop: 6,
  },
  dropdownTriggerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownOptionsContainer: {
    borderRadius: 14,
    marginTop: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.08)',
  },
  dropdownOption: {
    padding: Spacing.three,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
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
});
