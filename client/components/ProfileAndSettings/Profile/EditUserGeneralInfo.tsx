import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Button, SafeAreaView, TouchableOpacity, TextInput, Dimensions, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useFocusEffect } from '@react-navigation/native';
import { useUserData } from '@/hooks/useUserData';
import { useEditUserProfile } from '@/hooks/useEditUserData';
import UserNameEdit from '@/components/ProfileAndSettings/Profile/EditUserName';
import { EditUserLocation } from '@/components/ProfileAndSettings/Profile/EditLocation';
import EditUserBio from '@/components/ProfileAndSettings/Profile/EditUserBio';
import EditSocialMediaHandle from '@/components/ProfileAndSettings/Profile/EditSocialMediaHandle';
import NavigateBackButton from '@/components/NavigateBackButton';
import EditUserCoverPhotos from './EditUserCoverPhoto';
import EditUserProfilePhotos from './EditUserProfilePhoto';
import SaveUserChangesButton from './SaveUserChangesButton';
import SavedMessage from '@/components/SavedMessage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EditDateOfBirth from './EditDateOfBirth';
import { User } from '@/types/allTypes';
import SettingsPageHeader from '../Settings/SettingsPageHeader';
import { ThemedView } from '@/components/ThemedView';
import { LinearGradient } from 'expo-linear-gradient';

const EditUserGeneralInfo = () => {
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { fetchUserData, refetchUser } = useUserData();
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [locationLatitude, setLocationLatitude] = useState<number | null>(null);
  const [locationLongitude, setLocationLongitude] = useState<number | null>(null);
  const [locationInput, setLocationInput] = useState('');
  const [instagramUsername, setInstagramUsername] = useState('');
  const [facebookUsername, setFacebookUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const { editMyProfile, isLoading, showSavedMessage } = useEditUserProfile({
    firstName,
    lastName,
    bio,
    locationCity,
    locationState,
    locationInput,
    locationLatitude,
    locationLongitude,
    instagramUsername,
    facebookUsername,
    dateOfBirth
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    const fetchedUser = await fetchUserData();
    if (fetchedUser) {
      setUser(fetchedUser);
      setFirstName(fetchedUser.first_name || '');
      setLastName(fetchedUser.last_name || '');
      setBio(fetchedUser.bio || '');
      setLocationCity(fetchedUser.location?.city || '');
      setLocationState(fetchedUser.location?.state || '');
      setPlaceId(fetchedUser.location?.city || '');
      setLocationLatitude(fetchedUser.location?.coordinates?.lat || null);
      setLocationLongitude(fetchedUser.location?.coordinates?.lng || null);
      setLocationInput(fetchedUser.location?.text || '');
      setInstagramUsername(fetchedUser.social_handles?.instagram?.username || '');
      setFacebookUsername(fetchedUser.social_handles?.facebook?.username || '');
      setDateOfBirth(fetchedUser.date_of_birth ? new Date(fetchedUser.date_of_birth) : null);
    }
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const fetchedUser = await fetchUserData();
      if (fetchedUser) {
        setUser(fetchedUser);
        setFirstName(fetchedUser.first_name || '');
        setLastName(fetchedUser.last_name || '');
        setBio(fetchedUser.bio || '');
        setLocationCity(fetchedUser.location?.city || '');
        setLocationState(fetchedUser.location?.state || '');
        setPlaceId(fetchedUser.location?.city || '');
        setLocationLatitude(fetchedUser.location?.coordinates?.lat || null);
        setLocationLongitude(fetchedUser.location?.coordinates?.lng || null);
        setLocationInput(fetchedUser.location?.text || '');
        setInstagramUsername(fetchedUser.social_handles?.instagram?.username || '');
        setFacebookUsername(fetchedUser.social_handles?.facebook?.username || '');
        setDateOfBirth(fetchedUser.date_of_birth ? new Date(fetchedUser.date_of_birth) : null);
      }
    };

    getUser();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      refetchUser();
    }, [])
  );

  if (!user) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        stickyHeaderIndices={[0]}
        stickyHeaderHiddenOnScroll={true}
        style={{ flex: 1, width: '100%' }}
        scrollEventThrottle={16}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={themeColors.mountainGreen}
            colors={[themeColors.text]}
          />
        }
      >
        {/* Saved Message */}
        {showSavedMessage && (
          <SavedMessage visible={showSavedMessage} />
        )}

        {/* Profile Picture */}
        <View style={{ alignItems: 'center', marginTop: 32 }}>
          <EditUserProfilePhotos user={user} />
        </View>


        {/* User Info Inputs */}
        <View style={{ width: '100%', marginTop: 32, paddingHorizontal: 16 }}>
          {/* First Name */}
          <UserNameEdit
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First Name"
          />
          
          {/* Last Name */}
          <UserNameEdit
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last Name"
          />

          {/* Date of Birth */}
          <EditDateOfBirth dateOfBirth={dateOfBirth} setDateOfBirth={setDateOfBirth} />

          {/* Location */}
          <EditUserLocation
            label="Location"
            placeholder="Location"
            placeholderTextColor={themeColors.placeholderTextColor}
            themeColors={themeColors}
            locationInput={locationInput}
            setLocationInput={setLocationInput}
            setLocationCity={setLocationCity}
            setLocationState={setLocationState}
            setLocationLatitude={setLocationLatitude}
            setLocationLongitude={setLocationLongitude}
            setPlaceId={setPlaceId}
          />

          {/* Bio */}
          <EditUserBio
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Share a little about yourself and your interests"
          />
          
          {/* Social Media Handles */}
          {/* Instagram */}
          <EditSocialMediaHandle
            label="Instagram"
            value={instagramUsername}
            onChangeText={setInstagramUsername}
            iconName="instagram"
          />

          {/* Facebook */}
          <EditSocialMediaHandle
            label="Facebook"
            value={facebookUsername}
            onChangeText={setFacebookUsername}
            iconName="facebook"
          />
        </View>
        <View style={{ width: '100%', alignItems: 'center', marginBottom: 20 }}>
          <SaveUserChangesButton isLoading={isLoading} onPress={editMyProfile}/>
        </View>
      </ScrollView>
    </View>
  );
};

export default EditUserGeneralInfo;
