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
    image: require('@/assets/alpine_ski.png'),
    alt: 'Alpine Ski'
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