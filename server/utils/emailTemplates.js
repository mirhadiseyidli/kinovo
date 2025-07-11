/**
 * Email templates for different notification types
 */

const getBaseEmailTemplate = (content) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kinovo Notification</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: #ffffff;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #2E8B57;
          margin-bottom: 10px;
        }
        .content {
          margin-bottom: 30px;
        }
        .title {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin-bottom: 15px;
        }
        .subtitle {
          font-size: 16px;
          color: #666;
          margin-bottom: 20px;
        }
        .details {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .detail-item {
          margin-bottom: 10px;
        }
        .detail-label {
          font-weight: 600;
          color: #333;
        }
        .button {
          display: inline-block;
          background-color: #2E8B57;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 10px 5px;
        }
        .button:hover {
          background-color: #236B43;
        }
        .footer {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #eee;
          color: #666;
          font-size: 14px;
        }
        .unsubscribe {
          color: #999;
          font-size: 12px;
          margin-top: 15px;
        }
        .unsubscribe a {
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Kinovo</div>
          <div style="color: #666;">Stay connected with your active community</div>
        </div>
        
        ${content}
        
        <div class="footer">
          <p>This email was sent from Kinovo. If you no longer wish to receive these notifications, you can update your preferences in the app.</p>
          <div class="unsubscribe">
            <a href="https://kinovo.app/notifications">Manage notification preferences</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

const friendRequestEmailTemplate = (senderName, senderUsername, mutualFriendsCount = 0) => {
  const mutualFriendsText = mutualFriendsCount > 0 
    ? `<p>You have ${mutualFriendsCount} mutual friend${mutualFriendsCount > 1 ? 's' : ''} in common.</p>`
    : '';

  const content = `
    <div class="content">
      <h2 class="title">New Friend Request</h2>
      <p class="subtitle">${senderName} (@${senderUsername}) wants to connect with you on Kinovo!</p>
      
      ${mutualFriendsText}
      
      <p>Open the Kinovo app to accept or decline this friend request.</p>
      
      <a href="kinovo://friends/requests" class="button">View Friend Requests</a>
    </div>
  `;

  return getBaseEmailTemplate(content);
};

const friendRequestAcceptedEmailTemplate = (accepterName, accepterUsername) => {
  const content = `
    <div class="content">
      <h2 class="title">Friend Request Accepted</h2>
      <p class="subtitle">${accepterName} (@${accepterUsername}) accepted your friend request!</p>
      
      <p>You're now connected on Kinovo. Start planning activities together!</p>
      
      <a href="kinovo://profile/${accepterUsername}" class="button">View Profile</a>
    </div>
  `;

  return getBaseEmailTemplate(content);
};

const eventCreatedEmailTemplate = (creatorName, eventTitle, eventLocation, eventStartTime) => {
  const startDate = new Date(eventStartTime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const startTime = new Date(eventStartTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const content = `
    <div class="content">
      <h2 class="title">New Event Created</h2>
      <p class="subtitle">${creatorName} created a new event: "${eventTitle}"</p>
      
      <div class="details">
        <div class="detail-item">
          <span class="detail-label">Event:</span> ${eventTitle}
        </div>
        <div class="detail-item">
          <span class="detail-label">Date:</span> ${startDate}
        </div>
        <div class="detail-item">
          <span class="detail-label">Time:</span> ${startTime}
        </div>
        ${eventLocation ? `
        <div class="detail-item">
          <span class="detail-label">Location:</span> ${eventLocation}
        </div>
        ` : ''}
      </div>
      
      <p>Check it out and join if you're interested!</p>
      
      <a href="kinovo://events" class="button">View Event</a>
    </div>
  `;

  return getBaseEmailTemplate(content);
};

const eventUpdatedEmailTemplate = (updaterName, eventTitle, eventLocation, eventStartTime, isCancellation = false) => {
  const startDate = new Date(eventStartTime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const startTime = new Date(eventStartTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const content = `
    <div class="content">
      <h2 class="title">${isCancellation ? 'Event Cancelled' : 'Event Updated'}</h2>
      <p class="subtitle">${updaterName} ${isCancellation ? 'cancelled' : 'updated'} "${eventTitle}"</p>
      
      <div class="details">
        <div class="detail-item">
          <span class="detail-label">Event:</span> ${eventTitle}
        </div>
        <div class="detail-item">
          <span class="detail-label">Date:</span> ${startDate}
        </div>
        <div class="detail-item">
          <span class="detail-label">Time:</span> ${startTime}
        </div>
        ${eventLocation ? `
        <div class="detail-item">
          <span class="detail-label">Location:</span> ${eventLocation}
        </div>
        ` : ''}
      </div>
      
      ${isCancellation 
        ? '<p>Unfortunately, this event has been cancelled. We apologize for any inconvenience.</p>'
        : '<p>Check out the latest details for this event you\'re attending.</p>'
      }
      
      <a href="kinovo://events" class="button">${isCancellation ? 'View Events' : 'View Updated Event'}</a>
    </div>
  `;

  return getBaseEmailTemplate(content);
};

const eventAttendanceConfirmedEmailTemplate = (attendeeName, eventTitle, eventStartTime) => {
  const startDate = new Date(eventStartTime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const startTime = new Date(eventStartTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const content = `
    <div class="content">
      <h2 class="title">New Attendee</h2>
      <p class="subtitle">${attendeeName} is now attending "${eventTitle}"</p>
      
      <div class="details">
        <div class="detail-item">
          <span class="detail-label">Event:</span> ${eventTitle}
        </div>
        <div class="detail-item">
          <span class="detail-label">Date:</span> ${startDate}
        </div>
        <div class="detail-item">
          <span class="detail-label">Time:</span> ${startTime}
        </div>
      </div>
      
      <p>Great news! Your event is gaining momentum.</p>
      
      <a href="kinovo://events" class="button">View Event</a>
    </div>
  `;

  return getBaseEmailTemplate(content);
};

const eventReminderEmailTemplate = (eventTitle, eventLocation, eventStartTime) => {
  const startDate = new Date(eventStartTime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const startTime = new Date(eventStartTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const content = `
    <div class="content">
      <h2 class="title">Event Reminder</h2>
      <p class="subtitle">"${eventTitle}" starts in 1 hour!</p>
      
      <div class="details">
        <div class="detail-item">
          <span class="detail-label">Event:</span> ${eventTitle}
        </div>
        <div class="detail-item">
          <span class="detail-label">Date:</span> ${startDate}
        </div>
        <div class="detail-item">
          <span class="detail-label">Time:</span> ${startTime}
        </div>
        ${eventLocation ? `
        <div class="detail-item">
          <span class="detail-label">Location:</span> ${eventLocation}
        </div>
        ` : ''}
      </div>
      
      <p>Don't forget! Your event is starting soon. Get ready to have a great time!</p>
      
      <a href="kinovo://events" class="button">View Event Details</a>
    </div>
  `;

  return getBaseEmailTemplate(content);
};

const nearbyEventEmailTemplate = (eventTitle, eventLocation, eventStartTime, distance) => {
  const startDate = new Date(eventStartTime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const startTime = new Date(eventStartTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const content = `
    <div class="content">
      <h2 class="title">Event Near You</h2>
      <p class="subtitle">There's an exciting event happening near your location!</p>
      
      <div class="details">
        <div class="detail-item">
          <span class="detail-label">Event:</span> ${eventTitle}
        </div>
        <div class="detail-item">
          <span class="detail-label">Date:</span> ${startDate}
        </div>
        <div class="detail-item">
          <span class="detail-label">Time:</span> ${startTime}
        </div>
        ${eventLocation ? `
        <div class="detail-item">
          <span class="detail-label">Location:</span> ${eventLocation} (${distance} away)
        </div>
        ` : ''}
      </div>
      
      <p>Don't miss out on connecting with your local active community!</p>
      
      <a href="kinovo://events" class="button">View Event</a>
    </div>
  `;

  return getBaseEmailTemplate(content);
};

const passwordResetEmailTemplate = (userName, resetCode) => {
  const content = `
    <div class="content">
      <h2 class="title">Password Reset Request</h2>
      <p class="subtitle">Hi ${userName}, we received a request to reset your password.</p>
      
      <p>Use the verification code below to reset your password:</p>
      
      <div class="details" style="text-align: center; background-color: #f0f7ff; border: 2px solid #2E8B57; margin: 30px 0;">
        <div style="font-size: 32px; font-weight: bold; color: #2E8B57; letter-spacing: 4px; padding: 20px;">
          ${resetCode}
        </div>
      </div>
      
      <p><strong>This code will expire in 10 minutes.</strong></p>
      
      <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
      
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        For security reasons, this code can only be used once and will expire automatically.
      </p>
    </div>
  `;

  return getBaseEmailTemplate(content);
};

const eventInvitationEmailTemplate = (invitedBy, eventTitle, eventLocation, eventStartTime) => {
  const startDate = new Date(eventStartTime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const startTime = new Date(eventStartTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const content = `
    <div class="content">
      <h2 class="title">Event Invitation</h2>
      <p class="subtitle">You're invited to "${eventTitle}" by ${invitedBy}!</p>
      
      <div class="details">
        <div class="detail-item">
          <span class="detail-label">Event:</span> ${eventTitle}
        </div>
        <div class="detail-item">
          <span class="detail-label">Invited by:</span> ${invitedBy}
        </div>
        <div class="detail-item">
          <span class="detail-label">Date:</span> ${startDate}
        </div>
        <div class="detail-item">
          <span class="detail-label">Time:</span> ${startTime}
        </div>
        ${eventLocation ? `
        <div class="detail-item">
          <span class="detail-label">Location:</span> ${eventLocation}
        </div>
        ` : ''}
      </div>
      
      <p>Open the Kinovo app to respond to this invitation.</p>
      
      <a href="kinovo://events" class="button">View Invitation</a>
    </div>
  `;

  return getBaseEmailTemplate(content);
};

const contactJoinedEmailTemplate = (contactName, contactUsername) => {
  const content = `
    <div class="content">
      <h2 class="title">Contact Joined Kinovo</h2>
      <p class="subtitle">${contactName} from your contacts just joined Kinovo!</p>
      
      <p>Your contact ${contactName} (@${contactUsername}) is now on Kinovo. Connect with them to start planning activities together!</p>
      
      <a href="kinovo://profile/${contactUsername}" class="button">View Profile</a>
      <a href="kinovo://friends/add" class="button">Send Friend Request</a>
    </div>
  `;

  return getBaseEmailTemplate(content);
};

module.exports = {
  friendRequestEmailTemplate,
  friendRequestAcceptedEmailTemplate,
  eventCreatedEmailTemplate,
  eventUpdatedEmailTemplate,
  eventAttendanceConfirmedEmailTemplate,
  eventReminderEmailTemplate,
  nearbyEventEmailTemplate,
  passwordResetEmailTemplate,
  eventInvitationEmailTemplate,
  contactJoinedEmailTemplate
}; 