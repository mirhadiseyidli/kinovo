import { ImageSourcePropType } from 'react-native';

// Define the type for the category image mapping
export type CategoryImageType = {
  [key: string]: {
    image: ImageSourcePropType;
    alt: string;
  };
};

const CDN_DOMAIN = 'cdn.kinovo.app';
const CATEGORY_PATH = 'category';

// Map each category to its corresponding image
export const CategoryImages: CategoryImageType = {
  'Alpine Ski': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Alpine-Ski.png` },
    alt: 'Alpine Ski'
  },
  'Backcountry Ski': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Backcountry-Ski.png` },
    alt: 'Backcountry Ski'
  },
  'Badminton': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Badminton.png` },
    alt: 'Badminton'
  },
  'Canoeing': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Canoeing.png` },
    alt: 'Canoeing'
  },
  'Crossfit': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Crossfit.png` },
    alt: 'Crossfit'
  },
  'E-Bike Ride': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/E-Bike-Ride.png` },
    alt: 'E-Bike Ride'
  },
  'Elliptical': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Elliptical.png` },
    alt: 'Elliptical'
  },
  'E-Mountain Bike Ride': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/E-Mountain-Bike-Ride.png` },
    alt: 'E-Mountain Bike Ride'
  },
  'Golf': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Golf.png` },
    alt: 'Golf'
  },
  'Gravel Ride': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Gravel Ride.png` },
    alt: 'Gravel Ride'
  },
  'Handcycle': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Handcycle.png` },
    alt: 'Handcycle'
  },
  'High Intensity Interval Training': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/High Intensity Interval Training.png` },
    alt: 'High Intensity Interval Training'
  },
  'Hike': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Hike.png` },
    alt: 'Hike'
  },
  'Ice Skate': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Ice Skate.png` },
    alt: 'Ice Skate'
  },
  'Inline Skate': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Inline Skate.png` },
    alt: 'Inline Skate'
  },
  'Kayaking': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Kayaking.png` },
    alt: 'Kayaking'
  },
  'Kitesurf': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Kitesurf.png` },
    alt: 'Kitesurf'
  },
  'Mountain Bike Ride': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Mountain Bike Ride.png` },
    alt: 'Mountain Bike Ride'
  },
  'Nordic Ski': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Nordic Ski.png` },
    alt: 'Nordic Ski'
  },
  'Pickleball': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Pickleball-change.png` },
    alt: 'Pickleball'
  },
  'Pilates': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Pilates-change.png` },
    alt: 'Pilates'
  },
  'Ride': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Ride.png` },
    alt: 'Ride'
  },
  'Rock Climbing': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Rock Climbing.png` },
    alt: 'Rock Climbing'
  },
  'Roller Ski': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Roller Ski.png` },
    alt: 'Roller Ski'
  },
  'Rowing': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Rowing.png` },
    alt: 'Rowing'
  },
  'Run': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Run.png` },
    alt: 'Run'
  },
  'Sail': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Sail.png` },
    alt: 'Sail'
  },
  'Skateboard': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Skateboard.png` },
    alt: 'Skateboard'
  },
  'Snowboard': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Snowboard.png` },
    alt: 'Snowboard'
  },
  'Snowshoe': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Snowshoe.png` },
    alt: 'Snowshoe'
  },
  'Soccer': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Soccer.png` },
    alt: 'Soccer'
  },
  'Squash': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Squash.png` },
    alt: 'Squash'
  },
  'Stair Stepper': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Stair Stepper.png` },
    alt: 'Stair Stepper'
  },
  'Stand Up Paddling': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Stand Up Paddling.png` },
    alt: 'Stand Up Paddling'
  },
  'Surfing': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Surf.png` },
    alt: 'Surfing'
  },
  'Swim': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Swim.png` },
    alt: 'Swim'
  },
  'Table Tennis': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Table tennis.png` },
    alt: 'Table Tennis'
  },
  'Tennis': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Tennis.png` },
    alt: 'Tennis'
  },
  'Trail Run': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Run.png` },
    alt: 'Trail Run'
  },
  'Walk': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Run.png` },
    alt: 'Walk'
  },
  'Weight Training': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Crossfit.png` },
    alt: 'Weight Training'
  },
  'Yoga': {
    image: { uri: `https://${CDN_DOMAIN}/${CATEGORY_PATH}/Pilates-change.png` },
    alt: 'Yoga'
  },
  // Add a default image
  'Default': {
    image: { uri: `https://${CDN_DOMAIN}/event-default.png` },
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