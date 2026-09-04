import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image, Alert, Dimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { safeStorage as AsyncStorage } from '@/services/storage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { router } from 'expo-router';

export default function GalleryScreen() {
  const theme = useTheme();
  const [images, setImages] = useState<{ id: string; uri: string; date: string }[]>([]);
  const [isImagePickerModalVisible, setIsImagePickerModalVisible] = useState(false);
  const { width } = Dimensions.get('window');
  // Simple calculation for 3 columns on mobile, more on wider screens
  const numColumns = Math.max(3, Math.floor(Math.min(width, MaxContentWidth) / 120));

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const stored = await AsyncStorage.getItem('mandal_gallery');
      if (stored) {
        setImages(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load gallery', e);
    }
  };

  const saveImages = async (newImages: any) => {
    try {
      await AsyncStorage.setItem('mandal_gallery', JSON.stringify(newImages));
      setImages(newImages);
    } catch (e) {
      console.error('Failed to save gallery', e);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled && result.assets) {
      const newEntries = result.assets.map(asset => ({
        id: Date.now().toString() + Math.random().toString(),
        uri: asset.uri,
        date: new Date().toLocaleDateString('en-IN')
      }));
      
      saveImages([...newEntries, ...images]);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (!result.canceled && result.assets) {
      const newEntries = result.assets.map(asset => ({
        id: Date.now().toString() + Math.random().toString(),
        uri: asset.uri,
        date: new Date().toLocaleDateString('en-IN')
      }));
      
      saveImages([...newEntries, ...images]);
    }
  };

  const showUploadOptions = () => {
    setIsImagePickerModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Photo', 'Remove this photo from the Mandal Hub?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: () => {
          saveImages(images.filter(img => img.id !== id));
        }
      }
    ]);
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="subtitle">Media Hub</ThemedText>
          <Pressable onPress={showUploadOptions} style={styles.addButton}>
            <Ionicons name="add" size={24} color={theme.primary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerTextContainer}>
            <ThemedText style={{ opacity: 0.7 }}>
              Upload and share high-res photos for social media.
            </ThemedText>
          </View>

          {images.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={48} color={theme.textSecondary} style={{ marginBottom: 16 }} />
              <ThemedText type="smallBold" themeColor="textSecondary">No Photos Yet</ThemedText>
              <Pressable style={[styles.uploadButton, { backgroundColor: theme.primary }]} onPress={showUploadOptions}>
                <ThemedText type="smallBold" style={{ color: '#fff' }}>Upload Photos</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.grid}>
              {images.map((img) => (
                <Pressable 
                  key={img.id} 
                  onLongPress={() => handleDelete(img.id)}
                  style={[styles.imageContainer, { width: `${100/numColumns}%` }]}
                >
                  <Image source={{ uri: img.uri }} style={styles.image} />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

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
                Upload Photo
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginBottom: Spacing.six }}>
                Choose an option to upload the photo
              </ThemedText>

              <Pressable 
                style={[styles.pickerActionButton, { backgroundColor: theme.primaryLight, borderColor: theme.primaryBorder }]} 
                onPress={() => { setIsImagePickerModalVisible(false); handleTakePhoto(); }}
              >
                <Ionicons name="camera" size={24} color={theme.primary} />
                <ThemedText type="smallBold" style={{ color: theme.primary }}>Take a Photo</ThemedText>
              </Pressable>

              <Pressable 
                style={[styles.pickerActionButton, { backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: theme.activeTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} 
                onPress={() => { setIsImagePickerModalVisible(false); handlePickImage(); }}
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

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.three,
  },
  addButton: {
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: Spacing.two,
    paddingBottom: 100,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  headerTextContainer: {
    paddingHorizontal: Spacing.two,
    marginBottom: Spacing.four,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  uploadButton: {
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imageContainer: {
    padding: 2,
    aspectRatio: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
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
