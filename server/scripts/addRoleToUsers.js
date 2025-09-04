require('dotenv').config();
const { connectToDatabase } = require('../database/connection');
const User = require('../database/schemas/usersSchema');

async function addRoleToUsers() {
  try {
    console.log('Connecting to database...');
    await connectToDatabase();

    console.log('Adding role field to all existing users...');
    
    // Update all users without a role field to have role: 'user'
    const result = await User.updateMany(
      { role: { $exists: false } }, // Users without role field
      { $set: { role: 'user' } }
    );

    console.log(`✅ Updated ${result.modifiedCount} users with role: 'user'`);
    
    // Count total users with each role
    const userCount = await User.countDocuments({ role: 'user' });
    const adminCount = await User.countDocuments({ role: 'admin' });
    
    console.log(`📊 Current role distribution:`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Admins: ${adminCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating user roles:', error);
    process.exit(1);
  }
}

addRoleToUsers();