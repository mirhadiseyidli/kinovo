require('dotenv').config();
const { connectToDatabase } = require('../database/connection');
const User = require('../database/schemas/usersSchema');

async function setAdminRole() {
  try {
    console.log('Connecting to database...');
    await connectToDatabase();

    // Replace with your email address
    const adminEmail = 'seyidli.mirhadi@gmail.com'; // Update this to your email
    
    console.log(`Setting admin role for: ${adminEmail}`);
    
    const user = await User.findOneAndUpdate(
      { email: adminEmail },
      { $set: { role: 'admin' } },
      { new: true }
    );

    if (!user) {
      console.log(`❌ User with email ${adminEmail} not found`);
      console.log('Available users:');
      const users = await User.find({}).select('email full_name').limit(10);
      users.forEach(u => console.log(`  - ${u.email} (${u.full_name})`));
    } else {
      console.log(`✅ Successfully set ${user.full_name} (${user.email}) as admin`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting admin role:', error);
    process.exit(1);
  }
}

setAdminRole();