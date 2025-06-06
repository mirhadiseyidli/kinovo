import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import * as Contacts from 'expo-contacts';
import { AntDesign } from '@expo/vector-icons';
import FriendListUserItem from './FriendListUserItem'; // Adjust import as needed
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { useManageFriends } from '@/hooks/useManageFriends';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function ContactSyncScreen() {
  const [contactsPermission, setContactsPermission] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [synced, setSynced] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { syncContacts } = useManageFriends();

  const checkPermission = async () => {
    const { status } = await Contacts.getPermissionsAsync();
    const granted = status === 'granted';
    setContactsPermission(granted);
    if (granted) {
      await performSyncContacts();
    }
  };

  const performSyncContacts = async () => {
    const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
    const phoneNumbers = data
      .flatMap(contact => contact.phoneNumbers || [])
      .map(p => p.digits)
      .filter(num => Boolean(num && num.startsWith('+')));

    if (phoneNumbers.length === 0) return;

    const response = await syncContacts(phoneNumbers);
    const matchedNumbers: { _id: string; phoneNumber: string }[] = response.data;
    
    const matchedContacts = data.filter(c =>
      c.phoneNumbers?.some(p => p.digits && matchedNumbers.map(m => m.phoneNumber).includes(p.digits))
    );

    const matchedIds = new Set(matchedContacts.map(c => c.id));
    const allMapped = data
      .filter(c => c.phoneNumbers?.some(p => p.digits?.startsWith('+')))
      .map((c) => {
        const phoneDigits = c.phoneNumbers?.[0]?.digits;
        const matchedNumber = phoneDigits ? matchedNumbers.find(m => m.phoneNumber === phoneDigits) : undefined;
        return {
          _id: matchedNumber ? matchedNumber._id : c.id,
          full_name: c.name,
          phone_number: c.phoneNumbers?.[0]?.number || '',
          profile_picture: undefined,
          status: matchedIds.has(c.id) ? 'onKinovo' : 'invite',
        };
      });

    setContacts(allMapped);
    setSynced(true);
  };

  const handleSyncPress = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow contact access in your phone settings to sync your contacts.',
        [{ text: 'OK' }]
      );
      return;
    }
    setContactsPermission(true);
    performSyncContacts();
  };

  useEffect(() => {
    checkPermission();
  }, []);

  return (
    <View style={{ flex: 1, marginBottom: 16 }}>
      <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.text, marginBottom: 16 }}>Contacts on Kinovo</ThemedText>
      {!contactsPermission ? (
        <View style={{
          backgroundColor: themeColors.inputBackgroundColor,
          borderRadius: 16,
          padding: 20,
          alignItems: 'center',
        }}>
          <Text style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 16, marginBottom: 6 }}>
            Sync your contacts
          </Text>
          <Text style={{ color: themeColors.placeholderTextColor, textAlign: 'center', marginBottom: 16 }}>
            Find your friends who are already on Kinovo by syncing your contacts.
          </Text>
          <TouchableOpacity
            onPress={handleSyncPress}
            style={{
              backgroundColor: themeColors.mountainGreen,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontWeight: 'bold', color: themeColors.text }}>Sync Contacts</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {contacts.length === 0 ? (
            <View style={{
              backgroundColor: themeColors.background,
              borderRadius: 12,
              padding: 16,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: themeColors.border,
              width: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 120,
            }}>
              <View style={{ marginBottom: 12 }}>
                <IconSymbol
                  name="person.2"
                  size={32}
                  color={themeColors.placeholderTextColor}
                />
              </View>
              <ThemedText 
                style={{ 
                  fontSize: 16, 
                  color: themeColors.placeholderTextColor,
                  textAlign: 'center',
                  marginBottom: 4,
                  fontWeight: '600'
                }}
              >
                No contacts found on Kinovo
              </ThemedText>
              <ThemedText 
                style={{ 
                  fontSize: 14, 
                  color: themeColors.placeholderTextColor,
                  textAlign: 'center',
                  opacity: 0.8
                }}
              >
                Make sure numbers are saved with a country code (e.g. +1) 📱
              </ThemedText>
            </View>
          ) : (
            <View style={{ flexDirection: 'column', gap: 16 }}>
              {contacts.map((user) => (
                <FriendListUserItem
                  _id={user._id}
                  key={user._id}
                  name={user.full_name}
                  subtitle={user.phone_number}
                  avatarUri={user.profile_picture}
                  status={user.status}
                  onInvite={() => console.log(`Invite sent to ${user.full_name}`)}
                />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}