import React from 'react';
import { View, Dimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const { width, height } = Dimensions.get('window');

const activities = [
  'Alpine Ski', 'Backcountry Ski', 'Badminton', 'Boxing', 'Canoeing', 'Crossfit',
  'E-Bike Ride', 'Elliptical', 'E-Mountain Bike Ride', 'Golf', 'Gravel Ride',
  'Handcycle', 'High Intensity Interval Training', 'Hike', 'Ice Skate', 'Inline Skate',
  'Kayaking', 'Kickboxing', 'Kitesurf', 'Mountain Bike Ride', 'Nordic Ski',
  'Pickleball', 'Pilates', 'Racquetball', 'Ride', 'Rock Climbing', 'Roller Ski',
  'Rowing', 'Run', 'Sail', 'Skateboard', 'Snowboard', 'Snowshoe', 'Soccer',
  'Squash', 'Stair Stepper', 'Stand Up Paddling', 'Surfing', 'Swim',
  'Table Tennis', 'Tennis', 'Trail Run', 'Walk', 'Weight Training',
  'Windsurf', 'Workout', 'Yoga'
];

interface FloatingBubbleProps {
  activity: string;
  index: number;
  initialPosition: { x: number; y: number };
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const FloatingBubble: React.FC<FloatingBubbleProps> = ({ activity, index, initialPosition }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  
  const initialX = initialPosition.x;
  const initialY = initialPosition.y;
  const driftAmount = 20 + Math.random() * 30; // Smaller drift to keep bubbles in safe zones
  const scale = 0.7 + Math.random() * 0.4;
  const duration = (4000 + Math.random() * 4000) / 1000;
  const delay = (index * 200 + Math.random() * 1000) / 1000;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: initialX,
        top: initialY,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        maxWidth: width * 0.4,
        backgroundColor: colorScheme === 'dark' ? 'rgba(21, 184, 167, 0.15)' : 'rgba(21, 184, 167, 0.25)',
        borderColor: colorScheme === 'dark' ? 'rgba(21, 184, 167, 0.2)' : 'rgba(21, 184, 167, 0.3)',
        opacity: 0.5,
        transform: [{ scale }],
        animationName: {
          '0%': { 
            opacity: 0,
            transform: [{ translateX: 0 }],
          },
          '25%': { 
            opacity: 0.6 + Math.random() * 0.3,
            transform: [{ translateX: driftAmount }],
          },
          '75%': { 
            opacity: 0.6 + Math.random() * 0.3,
            transform: [{ translateX: -driftAmount }],
          },
          '100%': { 
            opacity: 0.6 + Math.random() * 0.3,
            transform: [{ translateX: 0 }],
          },
        },
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        animationIterationCount: 'infinite',
        animationDirection: 'alternate',
        animationTimingFunction: 'ease-in-out',
      }}
    >
      <ThemedText style={{
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
        color: themeColors.textSecondary,
        opacity: 1
      }}>
        {activity}
      </ThemedText>
    </Animated.View>
  );
};


const BackgroundElements: React.FC = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  // Available category icons to randomly select from (using actual icons from your app)
  const availableIcons: IconName[] = [
    'run-fast', 'golf', 'hiking', 'kitesurfing', 'terrain', 'sail-boat', 
    'swim', 'bicycle', 'tennis', 'yoga', 'dumbbell', 'soccer', 
    'snowboard', 'surfing', 'weight', 'ski-cross-country', 'badminton',
    'boxing-glove', 'karate', 'rowing', 'skateboarding', 'table-tennis'
  ];

  // Generate random category icons with random positions
  const generateRandomCategoryIcons = () => {
    const icons: Array<{
      icon: IconName;
      x: number;
      y: number;
      size: number;
      opacity: number;
    }> = [];
    const numIcons = 12; // Number of background icons to show
    
    for (let i = 0; i < numIcons; i++) {
      const randomIcon = availableIcons[Math.floor(Math.random() * availableIcons.length)];
      icons.push({
        icon: randomIcon,
        x: Math.random() * width,
        y: Math.random() * height,
        size: 14 + Math.random() * 10, // Random size between 14-24
        opacity: 0.08 + Math.random() * 0.12, // Random opacity between 0.08-0.2
      });
    }
    
    return icons;
  };

  const categoryIcons = React.useMemo(() => generateRandomCategoryIcons(), []);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {categoryIcons.map((element, index) => (
        <MaterialCommunityIcons
          key={index}
          name={element.icon}
          size={element.size}
          color={themeColors.mountainGreen}
          style={{
            position: 'absolute',
            left: element.x,
            top: element.y,
            opacity: element.opacity,
          }}
        />
      ))}
    </View>
  );
};

export default function AnimatedBackground() {
  const selectedActivities = activities
    .sort(() => 0.5 - Math.random())
    .slice(0, 10);

  // Generate non-overlapping positions for bubbles
  const generateNonOverlappingPositions = () => {
    const positions: Array<{ x: number; y: number }> = [];
    const bubbleSize = width * 0.4; // Max bubble width
    const minDistance = bubbleSize + 20; // Minimum distance between bubbles

    // Define exclusion zones (center area where logo and buttons are)
    const centerExclusionTop = height * 0.25;
    const centerExclusionBottom = height * 0.75;
    const centerExclusionLeft = width * 0.15;
    const centerExclusionRight = width * 0.85;

    const isInExclusionZone = (x: number, y: number) => {
      return x > centerExclusionLeft && 
             x < centerExclusionRight && 
             y > centerExclusionTop && 
             y < centerExclusionBottom;
    };

    const isOverlapping = (newPos: { x: number; y: number }, existingPositions: Array<{ x: number; y: number }>) => {
      return existingPositions.some(pos => {
        const distance = Math.sqrt(Math.pow(newPos.x - pos.x, 2) + Math.pow(newPos.y - pos.y, 2));
        return distance < minDistance;
      });
    };

    for (let i = 0; i < selectedActivities.length; i++) {
      let attempts = 0;
      let position: { x: number; y: number };
      
      do {
        position = {
          x: Math.random() * width,
          y: Math.random() * height
        };
        attempts++;
      } while (
        (isInExclusionZone(position.x, position.y) || isOverlapping(position, positions)) && 
        attempts < 100
      );

      positions.push(position);
    }

    return positions;
  };

  const bubblePositions = generateNonOverlappingPositions();

  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
    }}>
      <BackgroundElements />
      {selectedActivities.map((activity, index) => (
        <FloatingBubble
          key={`${activity}-${index}`}
          activity={activity}
          index={index}
          initialPosition={bubblePositions[index]}
        />
      ))}
    </View>
  );
}