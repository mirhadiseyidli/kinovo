import React from 'react';
import { View, Animated, Dimensions, DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface StoryLoadingPlaceholderProps {
  friendName?: string;
  friendProfilePicture?: string;
}

const StoryLoadingPlaceholder: React.FC<StoryLoadingPlaceholderProps> = ({
  friendName,
  friendProfilePicture
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = Dimensions.get('window');
  
  // Shimmer animation
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [shimmerAnim]);

  const shimmerStyle = {
    opacity: shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    }),
  };

  const ShimmerBox: React.FC<{ width: DimensionValue; height: number; borderRadius?: number }> = ({ 
    width, 
    height, 
    borderRadius = 8 
  }) => (
    <View
      style={{
        width,
        height,
        backgroundColor: themeColors.inputBackgroundColor,
        borderRadius,
      }}
    >
      <Animated.View
        style={[
          shimmerStyle,
          {
            width: '100%',
            height: '100%',
            backgroundColor: themeColors.placeholderTextColor,
            borderRadius,
          },
        ]}
      />
    </View>
  );

  return (
    <LinearGradient
      colors={[themeColors.mountainGreen, themeColors.background]}
      style={{
        flex: 1,
        height: '100%',
        width: '100%',
        paddingTop: insets.top,
      }}
    >
      <View style={{ flex: 1 }}>
        {/* Progress bars placeholder */}
        <View style={{ flexDirection: 'column', paddingHorizontal: 16, marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {[1, 2, 3].map((_, index) => (
              <ShimmerBox key={index} width="33%" height={2} borderRadius={1} />
            ))}
          </View>
          
          {/* Header with friend info */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginVertical: 16 
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ShimmerBox width={45} height={45} borderRadius={22.5} />
              <View style={{ marginLeft: 10 }}>
                <ShimmerBox width={120} height={16} borderRadius={8} />
              </View>
            </View>
            <ShimmerBox width={28} height={28} borderRadius={14} />
          </View>
        </View>

        {/* Main content area */}
        <View style={{ 
          flex: 1, 
          alignItems: 'center', 
          paddingHorizontal: 24, 
          transform: [{ rotate: '-2deg' }] 
        }}>
          <View style={{ width: '100%' }}>
            <LinearGradient
              colors={[themeColors.mountainGreen, themeColors.background]}
              style={{
                borderRadius: 16,
                shadowColor: themeColors.background,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 24,
                elevation: 10,
                alignItems: 'center',
              }}
            >
              <View style={{ 
                width: '100%', 
                backgroundColor: themeColors.blurOverlayColor, 
                paddingVertical: 32,
                borderRadius: 16,
              }}>
                {/* Event title and category */}
                <View style={{ alignItems: 'center', marginBottom: 32 }}>
                  <ShimmerBox width={200} height={24} borderRadius={12} />
                  <View style={{ marginTop: 8 }}>
                    <ShimmerBox width={120} height={16} borderRadius={8} />
                  </View>
                </View>

                {/* Event image placeholder */}
                <View style={{ 
                  width: '100%', 
                  aspectRatio: 16 / 9, 
                  marginBottom: 56,
                  paddingHorizontal: 32,
                }}>
                  <ShimmerBox width="100%" height={200} borderRadius={12} />
                </View>

                {/* Event details */}
                <View style={{ width: '100%', paddingHorizontal: 32 }}>
                  {/* Time */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <ShimmerBox width={20} height={20} borderRadius={10} />
                    <View style={{ marginLeft: 8 }}>
                      <ShimmerBox width={180} height={16} borderRadius={8} />
                    </View>
                  </View>
                  
                  {/* Location */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <ShimmerBox width={20} height={20} borderRadius={10} />
                    <View style={{ marginLeft: 8 }}>
                      <ShimmerBox width={150} height={16} borderRadius={8} />
                    </View>
                  </View>

                  {/* Attendees */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                    <ShimmerBox width={20} height={20} borderRadius={10} />
                    <View style={{ marginLeft: 8 }}>
                      <ShimmerBox width={100} height={16} borderRadius={8} />
                    </View>
                  </View>

                  {/* Divider */}
                  <View
                    style={{
                      width: '100%',
                      height: 1,
                      backgroundColor: themeColors.inputBackgroundColor,
                      marginBottom: 24,
                    }}
                  />

                  {/* Description */}
                  <View style={{ width: '100%', alignItems: 'flex-start', marginBottom: 24 }}>
                    <ShimmerBox width="100%" height={16} borderRadius={8} />
                    <View style={{ marginTop: 8 }}>
                      <ShimmerBox width="80%" height={16} borderRadius={8} />
                    </View>
                    <View style={{ marginTop: 8 }}>
                      <ShimmerBox width="60%" height={16} borderRadius={8} />
                    </View>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Loading indicator at bottom */}
        <View style={{ 
          position: 'absolute', 
          bottom: 100, 
          left: 0, 
          right: 0, 
          alignItems: 'center' 
        }}>
          <View style={{ 
            backgroundColor: themeColors.blurOverlayColor, 
            paddingHorizontal: 16, 
            paddingVertical: 8, 
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <Animated.View
              style={[
                {
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: themeColors.mountainGreen,
                  marginRight: 8,
                },
                shimmerStyle,
              ]}
            />
            <ShimmerBox width={80} height={14} borderRadius={7} />
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

export default StoryLoadingPlaceholder; 