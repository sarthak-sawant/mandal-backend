import React, { useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, Platform, Alert, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useAuth } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import { router } from 'expo-router';

export default function SchedulerScreen() {
  const theme = useTheme();
  const { occasionConfig } = useSettings();
  const { user } = useAuth();
  const viewShotRef = useRef(null);

  const [schedule, setSchedule] = useState([
    { id: 1, time: '08:00 AM', event: 'Morning Pooja & Abhishek' },
    { id: 2, time: '10:30 AM', event: 'Morning Maha-Aarti' },
    { id: 3, time: '04:00 PM', event: 'Prasad Distribution' },
    { id: 4, time: '08:00 PM', event: 'Evening Maha-Aarti' },
  ]);

  const [newTime, setNewTime] = useState(new Date());
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [newEvent, setNewEvent] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const handleAddEvent = async () => {
    if (!newEvent) return;
    const timeStr = formatTime(newTime);
    setSchedule([...schedule, { id: Date.now(), time: timeStr, event: newEvent }]);
    setNewEvent('');
    setNewTime(new Date());
  };

  const handleRemoveEvent = (id: number) => {
    setSchedule(schedule.filter(s => s.id !== id));
  };

  const handleShare = async () => {
    try {
      if (!viewShotRef.current) return;
      
      const uri = await captureRef(viewShotRef.current, {
        format: 'png',
        quality: 1,
      });

      if (Platform.OS === 'web') {
        // Web fallback for sharing
        alert('Sharing is not supported on web natively. Right-click or long-press the preview to save it.');
      } else {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            dialogTitle: 'Share Mandal Schedule',
            mimeType: 'image/png'
          });
        } else {
          Alert.alert('Sharing not available', 'Sharing is not available on this device');
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to generate schedule snapshot.');
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="subtitle">Schedule Maker</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* The View to capture */}
          <View style={{ borderRadius: 24, overflow: 'hidden', marginBottom: Spacing.four, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 }}>
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={{ backgroundColor: theme.activeTheme === 'dark' ? '#1E293B' : '#FFFBF7' }}>
              <View style={[styles.snapshotContainer, { borderColor: theme.primary }]}>
                {/* Decorative Header */}
                <View style={styles.festiveHeader}>
                  <ThemedText style={[styles.shreeText, { color: theme.primaryDark }]}>॥ श्री गणेशाय नमः ॥</ThemedText>
                  <ThemedText style={[styles.snapshotTitle, { color: theme.primary }]}>
                    {occasionConfig.marathiTitle}
                  </ThemedText>
                  <View style={[styles.decorativeLine, { backgroundColor: theme.primaryLight }]} />
                  <ThemedText style={styles.snapshotSubtitle}>
                    🌺 {formatDate(scheduleDate)} 🌺
                  </ThemedText>
                </View>
                
                <View style={styles.timelineContainer}>
                  {schedule.map((item, index) => (
                    <View key={item.id} style={styles.timelineRow}>
                      {/* Timeline Graphic */}
                      <View style={styles.timelineGraphic}>
                        <View style={[styles.timelineDot, { backgroundColor: theme.primary }]} />
                        {index < schedule.length - 1 && (
                          <View style={[styles.timelineLine, { backgroundColor: theme.primaryLight }]} />
                        )}
                      </View>
                      
                      {/* Timeline Content */}
                      <View style={styles.timelineContent}>
                        <ThemedText type="smallBold" style={[styles.timelineTime, { color: theme.primaryDark }]}>
                          {item.time}
                        </ThemedText>
                        <ThemedText style={styles.timelineEvent}>
                          {item.event}
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                </View>
                
                <View style={[styles.footerContainer, { borderTopColor: theme.primaryLight }]}>
                  <ThemedText type="smallBold" style={[styles.snapshotFooter, { color: theme.primary }]}>
                    सर्वांनी उपस्थित राहावे ही नम्र विनंती! 🙏
                  </ThemedText>
                </View>
              </View>
            </ViewShot>
          </View>

          <Pressable style={[styles.shareButton, { backgroundColor: theme.primary }]} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color="#fff" />
            <ThemedText type="smallBold" style={{ color: '#fff' }}>Share Snapshot</ThemedText>
          </Pressable>

          <View style={styles.editSection}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.three, marginTop: Spacing.two }}>
              Manage Schedule
            </ThemedText>
            
            <View style={styles.editListContainer}>
              {schedule.map((item) => (
                <View key={item.id} style={styles.editRow}>
                  <View style={[styles.editTimePill, { backgroundColor: theme.primaryLight }]}>
                    <ThemedText type="smallBold" style={{ color: theme.primaryDark }}>{item.time}</ThemedText>
                  </View>
                  <ThemedText style={styles.editEventText}>{item.event}</ThemedText>
                  <Pressable onPress={() => handleRemoveEvent(item.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              ))}
            </View>
            
            <View style={[styles.addForm, { backgroundColor: theme.activeTheme === 'dark' ? '#1E293B' : '#F1F5F9' }]}>
              {/* Date Picker Row */}
              <Pressable style={[styles.pickerButton, { borderColor: theme.primaryBorder, backgroundColor: theme.primaryLight }]} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                <ThemedText type="smallBold" style={{ color: theme.primary, flex: 1 }}>{formatDate(scheduleDate)}</ThemedText>
                <Ionicons name="chevron-down" size={14} color={theme.primary} />
              </Pressable>

              <View style={styles.inputGroup}>
                {/* Time Picker Button */}
                <Pressable style={[styles.timePickerButton, { borderColor: theme.primaryBorder, backgroundColor: theme.primaryLight }]} onPress={() => setShowTimePicker(true)}>
                  <Ionicons name="time-outline" size={18} color={theme.primary} />
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>{formatTime(newTime)}</ThemedText>
                </Pressable>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, flex: 2 }]}
                  placeholder="Event Name"
                  placeholderTextColor={theme.textSecondary}
                  value={newEvent}
                  onChangeText={setNewEvent}
                />
              </View>
              <Pressable onPress={handleAddEvent} style={[styles.addButton, { backgroundColor: theme.primary }]}>
                <Ionicons name="add" size={24} color="#fff" />
                <ThemedText type="smallBold" style={{ color: '#fff', marginLeft: 4 }}>Add Event</ThemedText>
              </Pressable>
            </View>

            {/* Date Picker */}
            {showDatePicker && (
              <DateTimePicker
                value={scheduleDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => { setShowDatePicker(false); if (date) setScheduleDate(date); }}
              />
            )}

            {/* Time Picker */}
            {showTimePicker && (
              <DateTimePicker
                value={newTime}
                mode="time"
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, time) => { setShowTimePicker(false); if (time) setNewTime(time); }}
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.three,
  },
  scrollContent: {
    padding: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: 100,
  },
  snapshotContainer: {
    padding: Spacing.six,
    alignItems: 'center',
    borderWidth: 12,
    borderRadius: 24,
    borderStyle: 'solid',
  },
  festiveHeader: {
    alignItems: 'center',
    marginBottom: Spacing.six,
    width: '100%',
  },
  shreeText: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 1,
  },
  snapshotTitle: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  decorativeLine: {
    height: 4,
    width: 60,
    borderRadius: 2,
    marginBottom: 12,
  },
  snapshotSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
  },
  timelineContainer: {
    width: '100%',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineGraphic: {
    width: 30,
    alignItems: 'center',
    marginRight: Spacing.three,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  timelineLine: {
    width: 3,
    flex: 1,
    marginTop: -4,
    marginBottom: -4,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.six,
  },
  timelineTime: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  timelineEvent: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 24,
  },
  footerContainer: {
    marginTop: Spacing.six,
    paddingTop: Spacing.four,
    borderTopWidth: 1,
    width: '80%',
    alignItems: 'center',
  },
  snapshotFooter: {
    fontSize: 14,
    textAlign: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    borderRadius: 12,
    gap: 8,
    marginVertical: Spacing.four,
  },
  editSection: {
    marginTop: Spacing.six,
  },
  editListContainer: {
    gap: 12,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 16,
    backgroundColor: 'rgba(150,150,150,0.05)',
  },
  editTimePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  editEventText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  addForm: {
    marginTop: Spacing.six,
    padding: Spacing.four,
    borderRadius: 20,
    gap: 12,
  },
  inputGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    flex: 1,
  },
});
