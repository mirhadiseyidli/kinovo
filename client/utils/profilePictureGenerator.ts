import { View, Text } from 'react-native';
import React from 'react';

// Color palette from categories
const CATEGORY_COLORS = [
  '#4FB9AF', // Teal
  '#6B63FF', // Purple
  '#6BCB77', // Green
  '#FF6B6B', // Red
  '#FFB347', // Orange
  '#9B59B6', // Deep Purple
  '#3498DB', // Blue
  '#E74C3C', // Dark Red
  '#2ECC71', // Emerald
  '#F1C40F'  // Yellow
];

export const getInitials = (firstName: string = '', lastName: string = ''): string => {
  const firstInitial = firstName.trim().charAt(0).toUpperCase();
  const lastInitial = lastName.trim().charAt(0).toUpperCase();
  
  if (firstInitial && lastInitial) {
    return `${firstInitial}${lastInitial}`;
  } else if (firstInitial) {
    return firstInitial;
  } else if (lastInitial) {
    return lastInitial;
  }
  
  return 'U'; // Default to 'U' for User
};

export const getRandomColor = (firstName: string = '', lastName: string = ''): string => {
  // Use the first name and last name to generate a consistent color index
  // This ensures the same user always gets the same color
  const nameString = `${firstName}${lastName}`.toLowerCase();
  let hash = 0;
  
  for (let i = 0; i < nameString.length; i++) {
    const char = nameString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get a consistent index
  const colorIndex = Math.abs(hash) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[colorIndex];
};

export const generateProfilePictureComponent = (
  firstName: string = '', 
  lastName: string = '', 
  size: number = 140
): React.ReactElement => {
  const initials = getInitials(firstName, lastName);
  const backgroundColor = getRandomColor(firstName, lastName);
  const fontSize = size * 0.35; // 35% of the size for better proportions
  
  return React.createElement(View, {
    style: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor,
      justifyContent: 'center',
      alignItems: 'center',
    }
  }, React.createElement(Text, {
    style: {
      fontSize,
      fontWeight: 'bold',
      color: 'white',
      textAlign: 'center',
    }
  }, initials));
};

// Generate a simple blob URL for profile picture (for web compatibility)
export const generateProfilePictureBlob = async (
  firstName: string = '', 
  lastName: string = '', 
  size: number = 400
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const initials = getInitials(firstName, lastName);
      const backgroundColor = getRandomColor(firstName, lastName);
      const fontSize = size * 0.35;
      
      // Create a simple HTML canvas approach for web
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw circle background
        ctx.fillStyle = backgroundColor;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw initials
        ctx.fillStyle = 'white';
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, size / 2, size / 2);
        
        // Convert to blob URL
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            resolve(url);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/png');
      } else {
        // For React Native, we'll need a different approach
        // This is a placeholder - in practice, we'd use react-native-svg or similar
        reject(new Error('Canvas not available in React Native environment'));
      }
    } catch (error) {
      reject(error);
    }
  });
}; 