require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../database/schemas/usersSchema');

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const users = await User.find().select('-password');
    console.log('\nUsers in database:');
    console.log('==================');
    
    users.forEach(user => {
      console.log(`\nID: ${user._id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.first_name} ${user.last_name}`);
      console.log(`Username: ${user.username}`);
      console.log('------------------');
    });

    console.log(`\nTotal users: ${users.length}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

listUsers(); 