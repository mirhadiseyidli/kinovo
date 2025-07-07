const cron = require('node-cron');
const User = require('../database/schemas/usersSchema');
const { sendEmail } = require('../utils/emailService');

// Run every day at midnight
const accountDeletionCron = cron.schedule('0 0 * * *', async () => {
  try {

    // Find all users whose deletion date has passed
    const usersToDelete = await User.find({
      delete_requested: true,
      deleted_at: { $lt: new Date() }
    });

    for (const user of usersToDelete) {
      try {
        // Send final deletion notification
        await sendEmail({
          to: user.email,
          subject: 'Account Permanently Deleted',
          html: `
            <h2>Account Permanently Deleted</h2>
            <p>Hello ${user.first_name},</p>
            <p>As per your request, your Kinovo account has been permanently deleted. All your data has been removed from our systems.</p>
            <p>Thank you for being part of our community.</p>
            <p>If you believe this was done in error, please contact our support team immediately.</p>
          `
        });

        // Permanently delete the user
        await User.deleteOne({ _id: user._id });
      } catch (error) {
        console.error(`Error processing deletion for user ${user._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in account deletion cron job:', error);
  }
});

module.exports = accountDeletionCron; 