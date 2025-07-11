const { sendEmail } = require('./emailService');
const {
  friendRequestEmailTemplate,
  friendRequestAcceptedEmailTemplate,
  eventCreatedEmailTemplate,
  eventUpdatedEmailTemplate,
  eventAttendanceConfirmedEmailTemplate,
  eventReminderEmailTemplate,
  nearbyEventEmailTemplate,
  eventInvitationEmailTemplate,
  contactJoinedEmailTemplate
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
      return;
    }

    let subject = '';
    let htmlContent = '';

    switch (notificationType) {
      case 'friend_request_accepted':
        subject = `${data.accepterName} accepted your friend request on Kinovo`;
        htmlContent = friendRequestAcceptedEmailTemplate(
          data.accepterName,
          data.accepterUsername
        );
        break;

      case 'new_event_from_friend':
        subject = `${data.creatorName} created a new event: ${data.eventTitle}`;
        htmlContent = eventCreatedEmailTemplate(
          data.creatorName,
          data.eventTitle,
          data.eventLocation,
          data.eventStartTime
        );
        break;

      case 'event_invitation':
        subject = `You're invited to "${data.eventTitle}"`;
        htmlContent = eventInvitationEmailTemplate(
          data.invitedBy,
          data.eventTitle,
          data.eventLocation,
          data.eventStartTime
        );
        break;

      case 'event_updated':
        subject = data.isCancellation ? `Event cancelled: ${data.eventTitle}` : `Event updated: ${data.eventTitle}`;
        htmlContent = eventUpdatedEmailTemplate(
          data.updaterName,
          data.eventTitle,
          data.eventLocation,
          data.eventStartTime,
          data.isCancellation
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

      case 'someone_from_contacts_joined':
        subject = `${data.contactName} from your contacts joined Kinovo`;
        htmlContent = contactJoinedEmailTemplate(
          data.contactName,
          data.contactUsername
        );
        break;

      default:
        return;
    }

    // Send the email
    await sendEmail({
      to: recipientEmail,
      subject: subject,
      html: htmlContent
    });

  } catch (error) {
    console.error(`Error sending email notification to ${recipientEmail}:`, error);
    // Don't throw error - email failures shouldn't break the main notification flow
  }
};

module.exports = {
  sendEmailNotification
}; 