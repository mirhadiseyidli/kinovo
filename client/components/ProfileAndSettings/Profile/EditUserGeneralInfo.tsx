import React, { useEffect, useState } from 'react';
import { View, Text, Image, Button, SafeAreaView, TouchableOpacity, TextInput, Dimensions, ScrollView, ActivityIndicator, Alert } from 'react-native';
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

const EditUserGeneralInfo = () => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { user, refetchUser } = useUserData();
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [locationCity, setLocationCity] = useState(user?.location?.city || '');
  const [locationState, setLocationState] = useState(user?.location?.state || '');
  const [placeId, setPlaceId] = useState(user?.location?.city || '');
  const [locationLatitude, setLocationLatitude] = useState(user?.location?.coordinates?.lat || null);
  const [locationLongitude, setLocationLongitude] = useState(user?.location?.coordinates?.lng || null);
  const [locationInput, setLocationInput] = useState(user?.location?.text || '');
  const [instagramUsername, setInstagramUsername] = useState(user?.social_handles?.instagram?.username || '');
  const [facebookUsername, setFacebookUsername] = useState(user?.social_handles?.facebook?.username || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.date_of_birth ? new Date(user.date_of_birth) : null);
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

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setBio(user.bio || '');
      setLocationCity(user.location?.city || '');
      setLocationState(user.location?.state || '');
      setPlaceId(user.location?.city || '');
      setLocationLatitude(user.location?.coordinates?.lat || null);
      setLocationLongitude(user.location?.coordinates?.lng || null);
      setLocationInput(user.location?.text || '');
      setInstagramUsername(user.social_handles?.instagram?.username || '');
      setFacebookUsername(user.social_handles?.facebook?.username || '');
      setDateOfBirth(user?.date_of_birth ? new Date(user.date_of_birth) : null);
    }
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      refetchUser();
    }, [])
  );

  if (!user) {
    return <Text>Loading...</Text>;
  }

  return (
    <SafeAreaView style={{ alignItems: 'center' }}>

      {/* Saved Message */}
      {showSavedMessage && (
        <SavedMessage visible={showSavedMessage} />
      )}

      {/* Back Button */}
      <NavigateBackButton
        color={themeColors.text}
        backgroundColor={themeColors.background}
      />

      {/* Cover Photo */}
      <EditUserCoverPhotos user={user} />

      {/* Profile Picture */}
      <EditUserProfilePhotos user={user} />

      {/* User Info Inputs */}
      <View style={{ width: '100%', marginTop: 32, paddingHorizontal: 16 }}>
        {/* First Name */}
        <UserNameEdit
          label="First Name"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First Name"
          placeholderTextColor={themeColors.placeholderTextColor}
          themeColors={themeColors}
        />
        
        {/* Last Name */}
        <UserNameEdit
          label="Last Name"
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last Name"
          placeholderTextColor={themeColors.placeholderTextColor}
          themeColors={themeColors}
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
      <SaveUserChangesButton isLoading={isLoading} onPress={editMyProfile}/>
    </SafeAreaView>
  );
};

export default EditUserGeneralInfo;
