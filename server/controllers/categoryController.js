const Category = require('../database/schemas/categorySchema');

const defaultCategories = [
  'Alpine Ski', 'Backcountry Ski', 'Badminton', 'Canoeing', 'Crossfit',
  'E-Bike Ride', 'Elliptical', 'E-Mountain Bike Ride', 'Golf', 'Gravel Ride',
  'Handcycle', 'High Intensity Interval Training', 'Hike', 'Ice Skate',
  'Inline Skate', 'Kayaking', 'Kitesurf', 'Mountain Bike Ride', 'Nordic Ski',
  'Pickleball', 'Pilates', 'Racquetball', 'Ride', 'Rock Climbing',
  'Roller Ski', 'Rowing', 'Run', 'Sail', 'Skateboard', 'Snowboard',
  'Snowshoe', 'Soccer', 'Squash', 'Stair Stepper', 'Stand Up Paddling',
  'Surfing', 'Swim', 'Table Tennis', 'Tennis', 'Trail Run', 'Velomobile',
  'Walk', 'Weight Training', 'Wheelchair', 'Windsurf', 'Workout', 'Yoga'
];

const initializeCategories = async () => {
  try {
    const existingCount = await Category.countDocuments();
    if (existingCount === 0) {
      const categories = defaultCategories.map(name => ({ name }));
      await Category.insertMany(categories);

    }
  } catch (error) {
    console.error('Error initializing categories:', error);
  }
};

const getCategories = async (req, res) => {
  try {
  
    const categories = await Category.find({ active: true })
      .select('name icon')
      .sort('name');
    
    
    res.status(200).json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const addCategory = async (req, res) => {
  try {
    const { name, icon } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = await Category.create({ name, icon });
    res.status(201).json({ category });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, active } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (name) category.name = name;
    if (icon !== undefined) category.icon = icon;
    if (active !== undefined) category.active = active;

    await category.save();
    res.status(200).json({ category });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  initializeCategories,
  getCategories,
  addCategory,
  updateCategory
}; 