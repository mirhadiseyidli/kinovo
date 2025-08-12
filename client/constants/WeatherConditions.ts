// Weather condition codes and gradients for Kinovo AI insights
export interface WeatherCondition {
  code: string;
  description: string;
  type: 'visibility' | 'wind' | 'precipitation' | 'hazardous' | 'winter' | 'tropical';
  emoji: string;
  gradients: {
    light: string[];
    dark: string[];
  };
}

export const WEATHER_CONDITIONS: WeatherCondition[] = [
  // Visibility conditions
  {
    code: 'BR',
    description: 'Mist',
    type: 'visibility',
    emoji: '🌫️',
    gradients: {
      light: ['#e0e7ff', '#c7d2fe', '#a5b4fc'],
      dark: ['#312e81', '#3730a3', '#4338ca']
    }
  },
  {
    code: 'FG',
    description: 'Fog',
    type: 'visibility',
    emoji: '🌫️',
    gradients: {
      light: ['#f3f4f6', '#e5e7eb', '#d1d5db'],
      dark: ['#374151', '#4b5563', '#6b7280']
    }
  },
  {
    code: 'FU',
    description: 'Smoke',
    type: 'visibility',
    emoji: '💨',
    gradients: {
      light: ['#fef3c7', '#fde68a', '#fcd34d'],
      dark: ['#78350f', '#92400e', '#a16207']
    }
  },
  {
    code: 'VA',
    description: 'Volcanic Ash',
    type: 'visibility',
    emoji: '🌋',
    gradients: {
      light: ['#fecaca', '#f87171', '#ef4444'],
      dark: ['#7f1d1d', '#991b1b', '#b91c1c']
    }
  },
  {
    code: 'DU',
    description: 'Dust',
    type: 'visibility',
    emoji: '🌪️',
    gradients: {
      light: ['#fef3c7', '#fed7aa', '#fdba74'],
      dark: ['#78350f', '#9a3412', '#c2410c']
    }
  },
  {
    code: 'SA',
    description: 'Sand',
    type: 'visibility',
    emoji: '🏜️',
    gradients: {
      light: ['#fbbf24', '#f59e0b', '#d97706'],
      dark: ['#78350f', '#92400e', '#a16207']
    }
  },
  {
    code: 'HZ',
    description: 'Haze',
    type: 'visibility',
    emoji: '😶‍🌫️',
    gradients: {
      light: ['#fef3c7', '#fde68a', '#fbbf24'],
      dark: ['#451a03', '#78350f', '#92400e']
    }
  },
  
  // Wind conditions
  {
    code: 'PO',
    description: 'Dust Whirls',
    type: 'wind',
    emoji: '🌪️',
    gradients: {
      light: ['#fed7aa', '#fdba74', '#fb923c'],
      dark: ['#9a3412', '#c2410c', '#dc2626']
    }
  },
  {
    code: 'SQ',
    description: 'Squalls',
    type: 'wind',
    emoji: '💨',
    gradients: {
      light: ['#cbd5e1', '#94a3b8', '#64748b'],
      dark: ['#1e293b', '#334155', '#475569']
    }
  },
  {
    code: 'FC',
    description: 'Funnel Cloud',
    type: 'wind',
    emoji: '🌪️',
    gradients: {
      light: ['#e4e4e7', '#a1a1aa', '#71717a'],
      dark: ['#18181b', '#27272a', '#3f3f46']
    }
  },
  {
    code: 'SS',
    description: 'Sandstorm',
    type: 'wind',
    emoji: '🌪️',
    gradients: {
      light: ['#fbbf24', '#f59e0b', '#d97706'],
      dark: ['#78350f', '#92400e', '#a16207']
    }
  },
  {
    code: 'DS',
    description: 'Duststorm',
    type: 'wind',
    emoji: '🌪️',
    gradients: {
      light: ['#fed7aa', '#fdba74', '#fb923c'],
      dark: ['#9a3412', '#c2410c', '#dc2626']
    }
  },

  // Precipitation conditions
  {
    code: 'DZ',
    description: 'Drizzle',
    type: 'precipitation',
    emoji: '🌦️',
    gradients: {
      light: ['#bae6fd', '#7dd3fc', '#38bdf8'],
      dark: ['#0c4a6e', '#075985', '#0369a1']
    }
  },
  {
    code: 'RA',
    description: 'Rain',
    type: 'precipitation',
    emoji: '🌧️',
    gradients: {
      light: ['#5dade2', '#3498db', '#85c1e9'],
      dark: ['#2c5aa0', '#1e3c72', '#4a6741']
    }
  },
  {
    code: 'SN',
    description: 'Snow',
    type: 'precipitation',
    emoji: '❄️',
    gradients: {
      light: ['#e8f4fd', '#b8daff', '#d6eaff'],
      dark: ['#4a5568', '#718096', '#a0aec0']
    }
  },
  {
    code: 'SG',
    description: 'Snow Grains',
    type: 'precipitation',
    emoji: '🌨️',
    gradients: {
      light: ['#f1f5f9', '#e2e8f0', '#cbd5e1'],
      dark: ['#334155', '#475569', '#64748b']
    }
  },
  {
    code: 'IC',
    description: 'Ice Crystals',
    type: 'precipitation',
    emoji: '💎',
    gradients: {
      light: ['#dbeafe', '#bfdbfe', '#93c5fd'],
      dark: ['#1e3a8a', '#1e40af', '#2563eb']
    }
  },
  {
    code: 'PL',
    description: 'Ice Pellets',
    type: 'precipitation',
    emoji: '🧊',
    gradients: {
      light: ['#e0f2fe', '#bae6fd', '#7dd3fc'],
      dark: ['#0c4a6e', '#075985', '#0369a1']
    }
  },
  {
    code: 'GR',
    description: 'Hail',
    type: 'precipitation',
    emoji: '🧊',
    gradients: {
      light: ['#f0f9ff', '#e0f2fe', '#bae6fd'],
      dark: ['#0c4a6e', '#075985', '#0369a1']
    }
  },
  {
    code: 'GS',
    description: 'Small Hail',
    type: 'precipitation',
    emoji: '🌨️',
    gradients: {
      light: ['#f0f9ff', '#e0f2fe', '#bae6fd'],
      dark: ['#0c4a6e', '#075985', '#0369a1']
    }
  },
  {
    code: 'UP',
    description: 'Unknown Precipitation',
    type: 'precipitation',
    emoji: '🌦️',
    gradients: {
      light: ['#e5e7eb', '#d1d5db', '#9ca3af'],
      dark: ['#374151', '#4b5563', '#6b7280']
    }
  },

  // Hazardous conditions
  {
    code: 'TS',
    description: 'Thunderstorm',
    type: 'hazardous',
    emoji: '⛈️',
    gradients: {
      light: ['#6366f1', '#4f46e5', '#3730a3'],
      dark: ['#1e1b4b', '#312e81', '#3730a3']
    }
  },

  // Winter conditions
  {
    code: 'BLSN',
    description: 'Blowing Snow',
    type: 'winter',
    emoji: '🌨️',
    gradients: {
      light: ['#f8fafc', '#f1f5f9', '#e2e8f0'],
      dark: ['#1e293b', '#334155', '#475569']
    }
  },
  {
    code: 'DRSN',
    description: 'Drifting Snow',
    type: 'winter',
    emoji: '❄️',
    gradients: {
      light: ['#f1f5f9', '#e2e8f0', '#cbd5e1'],
      dark: ['#334155', '#475569', '#64748b']
    }
  },

  // Tropical conditions
  {
    code: 'VCSH',
    description: 'Showers in Vicinity',
    type: 'tropical',
    emoji: '🌦️',
    gradients: {
      light: ['#bfdbfe', '#93c5fd', '#60a5fa'],
      dark: ['#1e3a8a', '#1e40af', '#2563eb']
    }
  },
  {
    code: 'VCTS',
    description: 'Thunderstorm in Vicinity',
    type: 'tropical',
    emoji: '⛈️',
    gradients: {
      light: ['#a78bfa', '#8b5cf6', '#7c3aed'],
      dark: ['#3c1361', '#581c87', '#6b21a8']
    }
  },
  {
    code: 'VCFG',
    description: 'Fog in Vicinity',
    type: 'tropical',
    emoji: '🌫️',
    gradients: {
      light: ['#f3f4f6', '#e5e7eb', '#d1d5db'],
      dark: ['#374151', '#4b5563', '#6b7280']
    }
  },

  // Clear/Fair conditions
  {
    code: 'CLR',
    description: 'Clear',
    type: 'visibility',
    emoji: '☀️',
    gradients: {
      light: ['#74b9ff', '#0984e3', '#a29bfe'],
      dark: ['#1a2a6c', '#b21a7b', '#f06292']
    }
  },
  {
    code: 'SKC',
    description: 'Sky Clear',
    type: 'visibility',
    emoji: '☀️',
    gradients: {
      light: ['#fbbf24', '#f59e0b', '#d97706'],
      dark: ['#78350f', '#92400e', '#a16207']
    }
  },
  {
    code: 'FEW',
    description: 'Few Clouds',
    type: 'visibility',
    emoji: '🌤️',
    gradients: {
      light: ['#dbeafe', '#bfdbfe', '#93c5fd'],
      dark: ['#1e3a8a', '#1e40af', '#2563eb']
    }
  },
  {
    code: 'SCT',
    description: 'Scattered Clouds',
    type: 'visibility',
    emoji: '⛅',
    gradients: {
      light: ['#cbd5e1', '#94a3b8', '#64748b'],
      dark: ['#334155', '#475569', '#64748b']
    }
  },
  {
    code: 'BKN',
    description: 'Broken Clouds',
    type: 'visibility',
    emoji: '☁️',
    gradients: {
      light: ['#90a4ae', '#b0bec5', '#cfd8dc'],
      dark: ['#2c3e50', '#4a5568', '#718096']
    }
  },
  {
    code: 'OVC',
    description: 'Overcast',
    type: 'visibility',
    emoji: '☁️',
    gradients: {
      light: ['#9ca3af', '#6b7280', '#4b5563'],
      dark: ['#1f2937', '#374151', '#4b5563']
    }
  }
];

// Helper functions
export const getConditionData = (code: string): WeatherCondition | null => {
  return WEATHER_CONDITIONS.find(condition => condition.code === code) || null;
};

export const getWeatherEmoji = (code: string): string => {
  const condition = getConditionData(code);
  return condition?.emoji || '🌤️'; // Default emoji
};

export const getWeatherGradient = (code: string, colorScheme: 'light' | 'dark' = 'light'): string[] => {
  const condition = getConditionData(code);
  if (condition) {
    return condition.gradients[colorScheme];
  }
  
  // Default gradient based on color scheme
  return colorScheme === 'dark' 
    ? ['#374151', '#4b5563', '#6b7280'] 
    : ['#e5e7eb', '#d1d5db', '#f3f4f6'];
};

// Legacy support - map common weather descriptions to codes
export const getWeatherConditionFromDescription = (description: string): WeatherCondition | null => {
  const lowerDescription = description.toLowerCase();
  
  // Map common descriptions to weather codes
  if (lowerDescription.includes('sunny') || lowerDescription.includes('clear')) {
    return getConditionData('CLR');
  } else if (lowerDescription.includes('cloud')) {
    if (lowerDescription.includes('few')) return getConditionData('FEW');
    if (lowerDescription.includes('scattered')) return getConditionData('SCT');
    if (lowerDescription.includes('broken')) return getConditionData('BKN');
    if (lowerDescription.includes('overcast')) return getConditionData('OVC');
    return getConditionData('SCT'); // Default to scattered
  } else if (lowerDescription.includes('rain')) {
    if (lowerDescription.includes('drizzle')) return getConditionData('DZ');
    return getConditionData('RA');
  } else if (lowerDescription.includes('snow')) {
    return getConditionData('SN');
  } else if (lowerDescription.includes('thunderstorm') || lowerDescription.includes('storm')) {
    return getConditionData('TS');
  } else if (lowerDescription.includes('fog')) {
    return getConditionData('FG');
  } else if (lowerDescription.includes('mist')) {
    return getConditionData('BR');
  } else if (lowerDescription.includes('haze')) {
    return getConditionData('HZ');
  }
  
  return null;
};