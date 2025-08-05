import React from 'react';
import { TouchableOpacity, Text, Dimensions } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather, Octicons } from '@expo/vector-icons';
import { ManageFriendButtonProps } from '@/types/allTypes';
import { shareContent } from '@/utils/shareUtils';

const ShareUserProfileButton = ({ targetUser, buttonFlex = 1 }: ManageFriendButtonProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <TouchableOpacity
      style={{
        marginTop: 16,
        flex: buttonFlex,
        backgroundColor: themeColors.inputBackgroundColor,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onPress={async () => {
        await shareContent('profile', targetUser, 'Check out this profile on Kinovo');
      }}
    >
      <Feather name='share-2' color={themeColors.text} size={16}/>
      <Text style={{ fontSize: 14, color: themeColors.text, fontWeight: 'bold', marginLeft: 4 }}>Share</Text>
    </TouchableOpacity>
  );
};

export default ShareUserProfileButton;