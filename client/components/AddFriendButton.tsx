import React from 'react';
import { TouchableOpacity, Text, Dimensions } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import LinearGradient from 'react-native-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { Feather, Octicons } from '@expo/vector-icons';
import { ManageFriendButtonProps } from '@/types/allTypes';

const AddFriendButton = ({ receiver }: ManageFriendButtonProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <TouchableOpacity
      style={{
        marginTop: 16,
        flex: 1,
        backgroundColor: themeColors.mountainGreen,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onPress={() => console.log('Sent friend request')}
    >
      <Feather name='user-plus' color={themeColors.text} size={16}/>
      <Text style={{ fontSize: 14, color: themeColors.text, fontWeight: 'bold', marginLeft: 4 }}>Add Friend</Text>
    </TouchableOpacity>
  );
};

export default AddFriendButton;