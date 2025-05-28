import React from 'react';
import { View, Text, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ImageColorsResult } from 'react-native-image-colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

type EventStoryContent = {
  event: {
    _id?: string;
    title?: string;
    category?: string | null;
    description?: string | null;
    location?: { text: string | null };
    start_time?: Date | null;
    attendees?: any[];
    creator?: {
      full_name?: string;
      profile_picture?: string;
    };
  };
  content?: string | { uri?: string };
  type?: string;
  finish?: number;
};

type EventCardProps = {
  content: EventStoryContent[];
  current: number;
  fadeAnim: Animated.Value;
  progress: Animated.Value;
  play: () => void;
  close: () => void;
  colors: ImageColorsResult | null;
};

const EventCard: React.FC<EventCardProps> = ({
  content,
  current,
  fadeAnim,
  progress,
  play,
  close,
  colors
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'column', paddingHorizontal: 16, marginBottom: 32 }}>
        <View style={{ flexDirection: 'row' }}>
          {content.map((_, key) => (
            <View
              key={key}
              style={{
                height: 2,
                flex: 1,
                flexDirection: 'row',
                backgroundColor: themeColors.placeholderTextColor,
                marginHorizontal: 2,
              }}
            >
              <Animated.View
                style={{
                  flex: current === key ? progress : content[key].finish,
                  height: 2,
                  backgroundColor: themeColors.background,
                }}
              />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 16 }}>
          {content[current]?.event?.creator?.profile_picture && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                style={{ height: 45, width: 45, borderRadius: 999 }}
                source={{ uri: content[current].event.creator.profile_picture }}
              />
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.text, paddingLeft: 10 }}>
                {content[current].event.creator?.full_name}
              </Text>
            </View>
          )}
          <View style={{ alignItems: 'center', justifyContent: 'center', height: 50, paddingHorizontal: 16 }}>
            <Ionicons name="close" size={28} color={themeColors.text} onPress={close} />
          </View>
        </View>
      </View>

      <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 24, transform: [{ rotate: '-2deg' }] }}>
        {content[current] && (
          <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
            <LinearGradient
              colors={
                colors?.platform === 'ios'
                  ? [colors.primary, colors.secondary]
                  : [themeColors.mountainGreen, themeColors.background]
              }
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
              <View style={{ width: '100%', backgroundColor: themeColors.blurOverlayColor, paddingVertical: 32 }}>
                <View style={{ alignItems: 'center', marginBottom: 32 }}>
                  <Text style={{ color: themeColors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
                    {content[current].event.title}
                  </Text>
                  <Text style={{ color: themeColors.textSecondary, fontSize: 16, fontWeight: '500', fontStyle: 'italic' }}>
                    {content[current].event.category}
                  </Text>
                </View>

                <View style={{ width: '100%', aspectRatio: 16 / 9, overflow: 'hidden', marginBottom: 56 }}>
                  <Image
                    source={
                      typeof content[current].content === 'string'
                        ? { uri: content[current].content }
                        : content[current].content
                    }
                    style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                  />
                </View>

                <View style={{ width: '100%', paddingHorizontal: 32 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Ionicons name="time-outline" size={20} color={themeColors.text} />
                    <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '500', marginLeft: 8 }}>
                      {content[current].event.start_time
                        ? new Date(content[current].event.start_time).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : 'Time not set'}
                    </Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Ionicons name="location-outline" size={20} color={themeColors.text} />
                    <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '500', marginLeft: 8 }}>
                      {content[current].event.location?.text}
                    </Text>
                  </View>

                  {typeof content[current].event.attendees?.length === 'number' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                      <Ionicons name="people-outline" size={20} color={themeColors.text} />
                      <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '500', marginLeft: 8 }}>
                        {content[current].event.attendees.length} attending
                      </Text>
                    </View>
                  )}

                  <View
                    style={{
                      width: '100%',
                      height: 1,
                      backgroundColor: themeColors.text,
                      opacity: 0.5,
                      marginBottom: 24,
                    }}
                  />

                  <View style={{ width: '100%', alignItems: 'flex-start', marginBottom: 24 }}>   
                    <Text
                      numberOfLines={4}
                      ellipsizeMode="tail"
                      style={{
                        fontStyle: 'italic',
                        fontWeight: '500',
                        color: themeColors.text,
                        lineHeight: 20,
                        textAlign: 'left',
                      }}
                    >
                      {content[current].event.description}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

export default EventCard;