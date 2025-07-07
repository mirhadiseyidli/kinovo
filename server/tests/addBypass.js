const User = require('../database/schemas/usersSchema');

const addBypass = async () => {
  try {
    const user = await User.find({
        email: 'seyidli_mirhadi@yahoo.com'
    });
    if (user) {
        user.bypass_two_factor_auth = true;
        await user.save();
        }
  } catch (error) {
    console.error('Error adding bypass:', error);
  }
}

addBypass();