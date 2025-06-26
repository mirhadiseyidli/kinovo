import React, { useState } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator, Alert, Image } from 'react-native';
import { useCDNImageUpload } from '@/hooks/useCDNImageUpload';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';

const CDNTestComponent = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [lastUploadedUrl, setLastUploadedUrl] = useState<string | null>(null);
  
  const {
    uploading,
    uploadProgress,
    pickAndUploadProfilePicture,
    getCDNInfo
  } = useCDNImageUpload();

  const testUpload = async () => {
    try {
      const result = await pickAndUploadProfilePicture();
      if (result.success) {
        setLastUploadedUrl(result.url || null);
        Alert.alert('Success!', `Image uploaded to CDN: ${result.url}`);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Test upload error:', error);
      Alert.alert('Error', 'Test upload failed');
    }
  };

  const testCDNInfo = async () => {
    try {
      const info = await getCDNInfo();
      if (info) {
        Alert.alert('CDN Info', JSON.stringify(info, null, 2));
      } else {
        Alert.alert('Error', 'Could not get CDN info');
      }
    } catch (error) {
      console.error('CDN info error:', error);
      Alert.alert('Error', 'Failed to get CDN info');
    }
  };

  return (
    <View style={{ 
      padding: 20, 
      backgroundColor: themeColors.background,
      borderRadius: 10,
      margin: 20,
      alignItems: 'center'
    }}>
      <Text style={{ 
        color: themeColors.text, 
        fontSize: 18, 
        fontWeight: 'bold',
        marginBottom: 20
      }}>
        CDN Upload Test
      </Text>

      {lastUploadedUrl && (
        <View style={{ marginBottom: 20, alignItems: 'center' }}>
          <Text style={{ color: themeColors.text, marginBottom: 10 }}>
            Last uploaded image:
          </Text>
          <Image 
            source={{ uri: lastUploadedUrl }} 
            style={{ 
              width: 100, 
              height: 100, 
              borderRadius: 50,
              borderWidth: 2,
              borderColor: themeColors.mountainGreen
            }} 
          />
        </View>
      )}

      <TouchableOpacity
        onPress={testUpload}
        disabled={uploading}
        style={{
          backgroundColor: uploading ? themeColors.inputBackgroundColor : themeColors.mountainGreen,
          padding: 15,
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 10,
          minWidth: 200,
          justifyContent: 'center'
        }}
      >
        {uploading ? (
          <>
            <ActivityIndicator size="small" color={themeColors.text} style={{ marginRight: 10 }} />
            <Text style={{ color: themeColors.text }}>
              Uploading... {uploadProgress}%
            </Text>
          </>
        ) : (
          <>
            <Feather name="upload" size={20} color="white" style={{ marginRight: 10 }} />
            <Text style={{ color: 'white', fontWeight: '600' }}>
              Test Upload
            </Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={testCDNInfo}
        style={{
          backgroundColor: themeColors.background,
          borderWidth: 1,
          borderColor: themeColors.mountainGreen,
          padding: 15,
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          minWidth: 200,
          justifyContent: 'center'
        }}
      >
        <Feather name="info" size={20} color={themeColors.mountainGreen} style={{ marginRight: 10 }} />
        <Text style={{ color: themeColors.mountainGreen, fontWeight: '600' }}>
          CDN Info
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default CDNTestComponent; 