import { AiMessageBubbleProps } from "@/types/allTypes";
import { View, Text } from 'react-native';
import { StreamingText } from "./StreamingText";
import PastEvent from "../Home/PastEvent";
import { WeatherCard } from "../Home/WeatherCard";
import { TrafficCard } from "../Home/TrafficCard";
import { ContextualLoading } from "../Home/ShimmerLoading";
import { Colors } from "@/constants/Colors";
import { getWeatherConditionFromDescription, getWeatherGradient } from "@/constants/WeatherConditions";

// Component for rendering message with structured data
export const MessageBubble = ({ message, colorScheme, isLoading, aiResponse, lastUserMessage, onLayout }: AiMessageBubbleProps) => {
    // Show loading state for streaming assistant message when loading starts
    if (message.id === 'streaming-assistant' && isLoading && !aiResponse) {
        const themeColors = Colors[colorScheme ?? 'dark'];
        return (
            <View style={{ marginHorizontal: 28, marginVertical: 12 }}>
                <ContextualLoading 
                    themeColors={themeColors}
                    userMessage={lastUserMessage || ''}
                />
            </View>
        );
    }

    // Content is already cleaned on the backend, no need for frontend processing
    const cleanContent = message.content;
  
    return (
      <>
        {/* Text Message - Keep in original container */}
        <View
          style={{
            alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
            alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: message.role === 'assistant' && (message.events?.length || message.event || message.weather || message.traffic) ? 8 : 12,
            marginHorizontal: 16,
            maxWidth: message.role === 'user' ? '85%' : undefined,
          }}
          onLayout={message.role === 'assistant' && message.id === 'streaming-assistant' ? onLayout : undefined}
        >
          <View
            style={{
              backgroundColor: message.role === 'user' ? '#2c2c2e' : 'transparent',
              borderRadius: 16,
              padding: 12,
              alignSelf: message.role === 'user' ? 'stretch' : 'flex-start',
            }}
          >
            {message.role === 'user' ? (
              <Text style={{ fontSize: 16, color: 'white', lineHeight: 22 }}>
                {message.content}
              </Text>
            ) : (
              <StreamingText 
                text={cleanContent} 
              />
            )}
          </View>
        </View>
  
        {/* Event Cards - Full width container */}
        {message.role === 'assistant' && message.events && message.events.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            {message.events
              .filter((event) => event && event._id && event.title && event.start_time && event.location) // Filter out invalid events
              .map((event, index, validEvents) => {
                return (
                  <View key={`${event._id}-${index}`} style={{ marginBottom: index < validEvents.length - 1 ? 8 : 0 }}>
                    <PastEvent event={event} loading={false} />
                  </View>
                );
              })}
          </View>
        )}
        
        {/* Single Event Card (backwards compatibility) - Full width */}
        {message.role === 'assistant' && !message.events && message.event && (
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <PastEvent event={message.event} loading={false} />
          </View>
        )}
  
        {/* Weather and Traffic Cards - Full width */}
        {message.role === 'assistant' && (message.weather || message.traffic) && (
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between',
            gap: 8,
            paddingHorizontal: 16,
            marginBottom: 12
          }}>
            {message.weather && (() => {
              console.log('🌡️ Weather data received:', message.weather);
              console.log('🌡️ Temperature value:', message.weather.temperature, typeof message.weather.temperature);
              
              return (
                <WeatherCard 
                  weather={{
                    temperature: `${message.weather.temperature}°F`,
                    condition: message.weather.condition || 'Current conditions',
                    emoji: message.weather.emoji || '🌤️',
                    recommendation: message.weather.recommendation || `Currently ${message.weather.temperature}°F with ${message.weather.condition}`
                  }}
                  backgroundColors={(() => {
                    const weatherCondition = getWeatherConditionFromDescription(message.weather.condition);
                    if (weatherCondition) {
                      return weatherCondition.gradients[colorScheme === 'dark' ? 'dark' : 'light'];
                    }
                    return getWeatherGradient(message.weather.conditionCode || 'CLR', colorScheme === 'dark' ? 'dark' : 'light');
                  })()}
                  coordinates={message.weather.coordinates || message.event?.location?.coordinates}
                />
              );
            })()}
            
            {message.traffic && (
              <TrafficCard 
                traffic={{
                  duration: message.traffic.duration,
                  condition: message.traffic.condition || 'Current traffic conditions',
                  emoji: message.traffic.emoji || '🚗',
                  recommendation: message.traffic.recommendation || `${message.traffic.traffic ? `Traffic: ${message.traffic.traffic}` : 'Check current conditions'}`
                }}
                mapImage={{ 
                  uri: message.traffic.mapSnapshotUrl
                    ? (colorScheme === 'dark' ? message.traffic.mapSnapshotUrl.dark : message.traffic.mapSnapshotUrl.light)
                    : 'https://cdn.kinovo.app/insight-map/map-dark.jpg' 
                }}
                coordinates={message.traffic.coordinates?.to}
                locationName={message.traffic.locationName}
              />
            )}
          </View>
        )}
        
        {/* Follow-up Suggestions */}
        {message.role === 'assistant' && message.followUpSuggestions && message.followUpSuggestions.length > 0 && (
          <View style={{ 
            paddingHorizontal: 16, 
            marginBottom: 12 
          }}>
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 12,
              padding: 12,
              gap: 8
            }}>
              <Text style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: 13,
                fontWeight: '600',
                marginBottom: 4
              }}>
                Quick actions:
              </Text>
              {message.followUpSuggestions.map((suggestion, index) => (
                <View key={index} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.4)'
                  }} />
                  <Text style={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: 14,
                    flex: 1,
                    lineHeight: 18
                  }}>
                    {suggestion}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </>
    );
  };