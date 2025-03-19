import React, { useEffect, useState } from 'react';
import { View, Text, Image, Button, SafeAreaView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@/context/UserContext';

const EditUserGeneralInfo = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  if (!user) {
    return <Text>Loading...</Text>;
  }

  return (
    <SafeAreaView style={{ alignItems: 'center' }}>
      <View style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        width: '100%', 
        height: 300, 
        zIndex: -1,
      }}>
        {user.coverPhoto ? (
          <>
            <Image
              source={{ uri: user.coverPhoto }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'red', themeColors.background]}
              style={{ position: 'absolute', width: '100%', height: '100%', bottom: 0 }}
            />
          </>
        ) : (
          <>
            <View style={{ width: '100%', height: '100%', backgroundColor: themeColors.mountainGreen }} />
            <LinearGradient
              colors={['transparent', themeColors.background]}
              style={{ position: 'absolute', width: '100%', height: '100%', bottom: 0 }}
            />
          </>
        )}
      </View>
      <View style={{ alignItems: 'center', marginTop: 150 }}>
        <View style={{ width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: themeColors.mountainGreen, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {user.profile_picture ? (
            <Image
              source={{ uri: user.profile_picture }}
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <Feather name="user" size={80} color={themeColors.mountainGreen} />
          )}
        </View>
      </View>
      <ThemedText style={{ fontWeight: 'bold', fontSize: 20, marginTop: 24, alignSelf: 'center' }}>{user.first_name} {user.last_name}</ThemedText>
      {(user.location && (user.location.city !== null && user.location.state !== null)) && (
        <Text style={{ fontSize: 16, color: 'gray', alignItems: 'center' }}>
          <Feather name="map-pin" size={16} />
          <ThemedText>{user.location.city}, {user.location.state}</ThemedText>
        </Text>
      )}
      {user.bio && (
        <Text style={{ fontSize: 14, color: 'gray', textAlign: 'center', marginVertical: 10 }}>{user.bio}</Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 24 }}>
        <View style={{ flexDirection: 'column', alignItems: 'center', marginVertical: 10 }}>
          <ThemedText style={{ marginBottom: 4, fontSize: 14 }}>Friends</ThemedText>
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>{user.friends?.length || 0}</ThemedText>
        </View>
        <View style={{ flexDirection: 'column', alignItems: 'center', marginVertical: 10 }}>
          <ThemedText style={{ marginBottom: 4, fontSize: 14 }}>Events</ThemedText>
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>{user.events?.length || 0}</ThemedText>
        </View>
      </View>
      <TouchableOpacity
        style={{
          backgroundColor: Colors[colorScheme ?? 'dark'].mountainGreen,
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 8,
          marginTop: 8
        }}
        onPress={() => console.log('Edit Profile')}
      >
        <Text style={{ color: Colors[colorScheme ?? 'dark'].text, fontWeight: 'bold' }}>{"Edit Profile"}</Text>
      </TouchableOpacity>
      <View style={{ flexDirection: 'row', marginTop: 24, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="instagram" size={24} style={{ marginHorizontal: 10, color: themeColors.text }} />
        <Feather name="facebook" size={24} style={{ marginHorizontal: 10, color: themeColors.text }} />
      </View>
    </SafeAreaView>
  );
};

export default EditUserGeneralInfo;
