import { ImageSourcePropType } from 'react-native';

// Define the type for the category image mapping
export type CategoryImageType = {
  [key: string]: {
    image: ImageSourcePropType;
    alt: string;
  };
};

// Map each category to its corresponding image
export const CategoryImages: CategoryImageType = {
  'Alpine Ski': {
    image: require('@/assets/Category/Alpine-Ski.png'),
    alt: 'Alpine Ski'
  },
  'Backcountry Ski': {
    image: require('@/assets/Category/Backcountry-Ski.png'),
    alt: 'Backcountry Ski'
  },
  'Badminton': {
    image: require('@/assets/Category/Badminton.png'),
    alt: 'Badminton'
  },
  'Canoeing': {
    image: require('@/assets/Category/Canoeing.png'),
    alt: 'Canoeing'
  },
  'Crossfit': {
    image: require('@/assets/Category/Crossfit.png'),
    alt: 'Crossfit'
  },
  'E-Bike Ride': {
    image: require('@/assets/Category/E-Bike-Ride.png'),
    alt: 'E-Bike Ride'
  },
  'Elliptical': {
    image: require('@/assets/Category/Elliptical.png'),
    alt: 'Elliptical'
  },
  'E-Mountain Bike Ride': {
    image: require('@/assets/Category/E-Mountain-Bike-Ride.png'),
    alt: 'E-Mountain Bike Ride'
  },
  'Golf': {
    image: require('@/assets/Category/Golf.png'),
    alt: 'Golf'
  },
  'Gravel Ride': {
    image: require('@/assets/Category/Gravel Ride.png'),
    alt: 'Gravel Ride'
  },
  'Handcycle': {
    image: require('@/assets/Category/Handcycle.png'),
    alt: 'Handcycle'
  },
  'High Intensity Interval Training': {
    image: require('@/assets/Category/High Intensity Interval Training.png'),
    alt: 'High Intensity Interval Training'
  },
  'Hike': {
    image: require('@/assets/Category/Hike.png'),
    alt: 'Hike'
  },
  'Ice Skate': {
    image: require('@/assets/Category/Ice Skate.png'),
    alt: 'Ice Skate'
  },
  'Inline Skate': {
    image: require('@/assets/Category/Inline Skate.png'),
    alt: 'Inline Skate'
  },
  'Kayaking': {
    image: require('@/assets/Category/Kayaking.png'),
    alt: 'Kayaking'
  },
  'Kitesurf': {
    image: require('@/assets/Category/Kitesurf.png'),
    alt: 'Kitesurf'
  },
  'Mountain Bike Ride': {
    image: require('@/assets/Category/Mountain Bike Ride.png'),
    alt: 'Mountain Bike Ride'
  },
  'Nordic Ski': {
    image: require('@/assets/Category/Nordic Ski.png'),
    alt: 'Nordic Ski'
  },
  'Pickleball': {
    image: require('@/assets/Category/Pickleball-change.png'),
    alt: 'Pickleball'
  },
  'Pilates': {
    image: require('@/assets/Category/Pilates-change.png'),
    alt: 'Pilates'
  },
  'Ride': {
    image: require('@/assets/Category/Ride.png'),
    alt: 'Ride'
  },
  'Rock Climbing': {
    image: require('@/assets/Category/Rock Climbing.png'),
    alt: 'Rock Climbing'
  },
  'Roller Ski': {
    image: require('@/assets/Category/Roller Ski.png'),
    alt: 'Roller Ski'
  },
  'Rowing': {
    image: require('@/assets/Category/Rowing.png'),
    alt: 'Rowing'
  },
  'Run': {
    image: require('@/assets/Category/Run.png'),
    alt: 'Run'
  },
  'Sail': {
    image: require('@/assets/Category/Sail.png'),
    alt: 'Sail'
  },
  'Skateboard': {
    image: require('@/assets/Category/Skateboard.png'),
    alt: 'Skateboard'
  },
  'Snowboard': {
    image: require('@/assets/Category/Snowboard.png'),
    alt: 'Snowboard'
  },
  'Snowshoe': {
    image: require('@/assets/Category/Snowshoe.png'),
    alt: 'Snowshoe'
  },
  'Soccer': {
    image: require('@/assets/Category/Soccer.png'),
    alt: 'Soccer'
  },
  'Squash': {
    image: require('@/assets/Category/Squash.png'),
    alt: 'Squash'
  },
  'Stair Stepper': {
    image: require('@/assets/Category/Stair Stepper.png'),
    alt: 'Stair Stepper'
  },
  'Stand Up Paddling': {
    image: require('@/assets/Category/Stand Up Paddling.png'),
    alt: 'Stand Up Paddling'
  },
  'Surfing': {
    image: require('@/assets/Category/Surf.png'),
    alt: 'Surfing'
  },
  'Swim': {
    image: require('@/assets/Category/Swim.png'),
    alt: 'Swim'
  },
  'Table Tennis': {
    image: require('@/assets/Category/Table tennis.png'),
    alt: 'Table Tennis'
  },
  'Tennis': {
    image: require('@/assets/tennis-court.jpg'),
    alt: 'Tennis'
  },
  'Trail Run': {
    image: require('@/assets/Category/Run.png'),
    alt: 'Trail Run'
  },
  'Walk': {
    image: require('@/assets/Category/Run.png'),
    alt: 'Walk'
  },
  'Weight Training': {
    image: require('@/assets/Category/Crossfit.png'),
    alt: 'Weight Training'
  },
  'Yoga': {
    image: require('@/assets/Category/Pilates-change.png'),
    alt: 'Yoga'
  },
  // Add a default image
  'Default': {
    image: require('@/assets/event-default.png'),
    alt: 'Default Event Image'
  }
};

// Helper function to get the image for a category
export const getCategoryImage = (category: string | null | undefined): ImageSourcePropType => {
  if (!category || !(category in CategoryImages)) {
    return CategoryImages['Default'].image;
  }
  return CategoryImages[category].image;
}; 