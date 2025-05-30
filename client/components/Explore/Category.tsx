import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ExploreCategoryProps } from '@/types/allTypes';
import { getCategoryIcon } from '@/utils/categoryIcons';

const CATEGORY_SIZE = 108;
const ICON_CONTAINER_HEIGHT = 40; // Fixed height for icon container
const TEXT_CONTAINER_HEIGHT = 40; // Fixed height for text container
const LINE_HEIGHT = 13;

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const Category: React.FC<ExploreCategoryProps> = ({ iconName, label, iconColor, onPress }) => {
  const colorScheme = useColorScheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: CATEGORY_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        shadowColor: Colors[colorScheme ?? 'dark'].tint,
        shadowOffset: { width: 0, height: 0.5 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
        backgroundColor: 'transparent',
        alignSelf: 'stretch',
        marginVertical: 8,
      }}
    >
      <ThemedView
        style={{
          overflow: 'hidden',
          borderRadius: 20,
          width: CATEGORY_SIZE,
          height: CATEGORY_SIZE,
        }}
      >
        <ThemedView
          style={{
            flex: 1,
            padding: 16,
            alignItems: 'center',
          }}
        >
          {/* Icon Container */}
          <View style={{
            height: ICON_CONTAINER_HEIGHT,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <MaterialCommunityIcons name={getCategoryIcon(label)} size={32} color={iconColor} />
          </View>

          {/* Text Container */}
          <View style={{
            height: TEXT_CONTAINER_HEIGHT,
            width: '100%',
            overflow: 'hidden',
          }}>
            <ThemedText 
              style={{ 
                fontSize: 10,
                fontWeight: 'bold',
                textAlign: 'center',
                lineHeight: LINE_HEIGHT,
                position: 'absolute',
                top: 10,
                left: 0,
                right: 0,
              }}
              numberOfLines={2}
            >
              {label}
            </ThemedText>
          </View>
        </ThemedView>
      </ThemedView>
    </TouchableOpacity>
  );
};

export default Category;