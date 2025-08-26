import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Text, ScrollView, TouchableOpacity, StyleSheet, View } from 'react-native';
import { useMemo } from 'react';

const PredefinedMessages = [
  { title: 'Find hiking events', text: 'near me this weekend' },
  { title: 'Create an event', text: 'on Saturday at 10am' },
  { title: 'Check weather', text: 'for my next event' },
  { title: 'Find yoga sessions', text: 'happening this week' },
  { title: 'Join an event', text: 'happening soon' },

  { title: 'Show my upcoming events', text: 'for this week' },
  { title: 'Cancel an event', text: 'I created' },
  { title: 'Invite someone', text: 'to my event' },
  { title: 'Remove attendee', text: 'from an event' },
  { title: 'Update event time', text: 'to 5pm' },

  { title: 'Check traffic', text: 'to the event location' },
  { title: 'Search outdoor events', text: 'near me' },
  { title: 'Create a recurring event', text: 'every Saturday at 8am' },
  { title: 'Search by category', text: 'cycling events this month' },
  { title: 'Show all events I joined', text: 'this month' },

  { title: 'Find events by keyword', text: 'like volleyball or brunch' },
  { title: 'Get directions', text: 'to an event' },
  { title: 'Create a private event', text: 'for a small group' },
  { title: 'Show past events', text: 'from last week' },
  { title: 'Find events with space', text: 'this weekend' },

  { title: 'Search nearby activities', text: 'in my area' },
  { title: 'Suggest events', text: 'based on my interests' },
  { title: 'Join a public event', text: 'in my city' },
  { title: 'Check my event status', text: 'for an upcoming event' },
  { title: 'Plan an event', text: 'with 10 people' },

  { title: 'Set event location', text: 'to a park or trail' },
  { title: 'Search for running events', text: 'next weekend' },
  { title: 'Get current weather', text: 'at the event location' },
  { title: 'View attendees', text: 'for my event' },
  { title: 'Leave an event', text: 'I\’m attending' },

  { title: 'Confirm event location', text: 'for event creation' },
  { title: 'Search for upcoming events', text: 'this evening' },
  { title: 'Filter events by type', text: 'like group or solo' },
  { title: 'Create an event with description', text: 'and category' },
  { title: 'Show events I\’m invited to', text: 'this week' },

  { title: 'Cancel a recurring event', text: 'I created' },
  { title: 'Edit event visibility', text: 'to public' },
  { title: 'Set event capacity', text: 'to 15 people' },
  { title: 'Show RSVP status', text: 'for all attendees' },
  { title: 'Update event location', text: 'to a new address' },

  { title: 'Search outdoor games', text: 'happening soon' },
  { title: 'Create a one-time event', text: 'on Friday at noon' },
  { title: 'Find weekend events', text: 'in nearby parks' },
  { title: 'Get traffic time', text: 'to the event destination' },
  { title: 'Check if I\’m attending', text: 'a specific event' },

  { title: 'Search for social events', text: 'this afternoon' },
  { title: 'Join an event', text: 'with available spots' },
  { title: 'Create a private meet-up', text: 'with no invitees' },
  { title: 'List upcoming recurring events', text: 'I\’m part of' },
  { title: 'Suggest popular events', text: 'happening this weekend' }
];

type Props = {
  onSelectCard: (message: string) => void;
  onScrollStart?: () => void;
  onScrollEnd?: () => void;
};

const MessageIdeas = ({ onSelectCard, onScrollStart, onScrollEnd }: Props) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  
  // Randomly select 5 messages
  const randomMessages = useMemo(() => {
    const shuffled = [...PredefinedMessages].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  }, []);
  
  return (
    <View style={{ zIndex: 1000 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={onScrollStart}
        onScrollEndDrag={onScrollEnd}
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingVertical: 10,
          gap: 16,
        }}>
        {randomMessages.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={{ backgroundColor: themeColors.eventCardBackgroundColor, padding: 16, borderRadius: 10, gap: 4 }}
            onPress={() => onSelectCard(`${item.title} ${item.text}`)}
          >
            <Text style={{ fontSize: 16, fontWeight: '500', color: themeColors.text }}>{item.title}</Text>
            <Text style={{ color: themeColors.textThird, fontSize: 14 }}>{item.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default MessageIdeas;