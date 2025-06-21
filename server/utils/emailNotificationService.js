const { sendEmail } = require('./emailService');
const {
  friendRequestEmailTemplate,
  friendRequestAcceptedEmailTemplate,
  eventCreatedEmailTemplate,
  eventUpdatedEmailTemplate,
  eventAttendanceConfirmedEmailTemplate,
  eventReminderEmailTemplate,
  nearbyEventEmailTemplate
} = require('./emailTemplates');

/**
 * Send email notification based on type and data
 * @param {string} recipientEmail - Recipient's email address
 * @param {string} notificationType - Type of notification
 * @param {Object} data - Notification data
 */
const sendEmailNotification = async (recipientEmail, notificationType, data) => {
  try {
    if (!recipientEmail) {
      console.log('No recipient email provided, skipping email notification');
      return;
    }

    let subject = '';
    let htmlContent = '';

    switch (notificationType) {
      case 'friend_request':
        subject = `${data.senderName} sent you a friend request on Kinovo`;
        htmlContent = friendRequestEmailTemplate(
          data.senderName,
          data.senderUsername,
          data.mutualFriendsCount
        );
        break;

      case 'friend_request_accepted':
        subject = `${data.accepterName} accepted your friend request on Kinovo`;
        htmlContent = friendRequestAcceptedEmailTemplate(
          data.accepterName,
          data.accepterUsername
        );
        break;

      case 'event_created':
        subject = `${data.creatorName} created a new event: ${data.eventTitle}`;
        htmlContent = eventCreatedEmailTemplate(
          data.creatorName,
          data.eventTitle,
          data.eventLocation,
          data.eventStartTime
        );
        break;

      case 'event_updated':
        subject = `Event updated: ${data.eventTitle}`;
        htmlContent = eventUpdatedEmailTemplate(
          data.updaterName,
          data.eventTitle,
          data.eventLocation,
          data.eventStartTime
        );
        break;

      case 'event_attendance_confirmed':
        subject = `${data.attendeeName} is attending your event: ${data.eventTitle}`;
        htmlContent = eventAttendanceConfirmedEmailTemplate(
          data.attendeeName,
          data.eventTitle,
          data.eventStartTime
        );
        break;

      case 'event_reminder':
        subject = `Reminder: ${data.eventTitle} starts in 1 hour`;
        htmlContent = eventReminderEmailTemplate(
          data.eventTitle,
          data.eventLocation,
          data.eventStartTime
        );
        break;

      case 'new_event_nearby':
        subject = `New event near you: ${data.eventTitle}`;
        htmlContent = nearbyEventEmailTemplate(
          data.eventTitle,
          data.eventLocation,
          data.eventStartTime,
          data.distance
        );
        break;

      default:
        console.log(`Unknown notification type for email: ${notificationType}`);
        return;
    }

    // Send the email
    await sendEmail({
      to: recipientEmail,
      subject: subject,
      html: htmlContent
    });

    console.log(`Email notification sent successfully to ${recipientEmail} for ${notificationType}`);
  } catch (error) {
    console.error(`Error sending email notification to ${recipientEmail}:`, error);
    // Don't throw error - email failures shouldn't break the main notification flow
  }
};

module.exports = {
  sendEmailNotification
}; 