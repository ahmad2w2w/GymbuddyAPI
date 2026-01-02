import { useState } from 'react';
import { View, StyleSheet, Image, Alert } from 'react-native';
import { IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/lib/api';

interface AvatarPickerProps {
  currentAvatar: string | null;
  onAvatarChange: (newUrl: string) => void;
  size?: number;
}

export function AvatarPicker({ currentAvatar, onAvatarChange, size = 120 }: AvatarPickerProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Toegang nodig', 'We hebben toegang tot je foto\'s nodig om een profielfoto te kiezen.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setLoading(true);
        try {
          const imageBase64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
          const response = await api.uploadAvatar(imageBase64);
          if (response.success) {
            onAvatarChange(response.data.avatarUrl);
          }
        } catch (e: any) {
          Alert.alert('Fout', e.message || 'Kon foto niet uploaden');
        } finally {
          setLoading(false);
        }
      }
    } catch (e) {
      console.error('Image picker error:', e);
      Alert.alert('Fout', 'Er ging iets mis bij het kiezen van een foto');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Toegang nodig', 'We hebben toegang tot je camera nodig om een foto te maken.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setLoading(true);
        try {
          const imageBase64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
          const response = await api.uploadAvatar(imageBase64);
          if (response.success) {
            onAvatarChange(response.data.avatarUrl);
          }
        } catch (e: any) {
          Alert.alert('Fout', e.message || 'Kon foto niet uploaden');
        } finally {
          setLoading(false);
        }
      }
    } catch (e) {
      console.error('Camera error:', e);
      Alert.alert('Fout', 'Er ging iets mis bij het maken van een foto');
    }
  };

  const showOptions = () => {
    Alert.alert(
      'Profielfoto',
      'Kies een optie',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Galerij', onPress: pickImage },
        { text: 'Annuleren', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.avatarContainer, { width: size, height: size, borderRadius: size / 2 }]}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : currentAvatar ? (
          <Image 
            source={{ uri: currentAvatar }} 
            style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} 
          />
        ) : (
          <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.primaryContainer }]}>
            <IconButton icon="account" size={size * 0.5} iconColor={theme.colors.primary} />
          </View>
        )}
      </View>
      
      <IconButton
        icon="camera"
        mode="contained"
        size={24}
        onPress={showOptions}
        style={[styles.editButton, { backgroundColor: theme.colors.primary }]}
        iconColor="white"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'center',
  },
  avatarContainer: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    resizeMode: 'cover',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
});
