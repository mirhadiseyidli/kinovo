export const ACTIVITIES = [
  'Alpine Ski', 'Backcountry Ski', 'Badminton', 'Boxing', 'Canoeing', 'Crossfit',
  'E-Bike Ride', 'Elliptical', 'E-Mountain Bike Ride', 'Golf', 'Gravel Ride',
  'Handcycle', 'High Intensity Interval Training', 'Hike', 'Ice Skate',
  'Inline Skate', 'Kayaking', 'Kickboxing', 'Kitesurf', 'Mountain Bike Ride', 'Nordic Ski',
  'Pickleball', 'Pilates', 'Racquetball', 'Ride', 'Rock Climbing',
  'Roller Ski', 'Rowing', 'Run', 'Sail', 'Skateboard', 'Snowboard',
  'Snowshoe', 'Soccer', 'Squash', 'Stair Stepper', 'Stand Up Paddling',
  'Surfing', 'Swim', 'Table Tennis', 'Tennis', 'Trail Run', 
  'Walk', 'Weight Training', 'Windsurf', 'Workout', 'Yoga'
] as const;

export type Activity = typeof ACTIVITIES[number]; 