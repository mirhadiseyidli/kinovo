const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

// Create an OAuth2 client
const createOAuth2Client = () => {
  return new OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
};

// Get access token using refresh token
const getAccessToken = async () => {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });
    
    const { token } = await oauth2Client.getAccessToken();
    return token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw new Error('Failed to get access token');
  }
};

// Create a transporter using OAuth2
const createTransporter = async () => {
  try {
    const accessToken = await getAccessToken();
    
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 465,
      secure: process.env.SMTP_SECURE === 'true' || true, // true for 465, false for other ports
      auth: {
        type: 'OAuth2',
        user: process.env.SMTP_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken
      }
    });
  } catch (error) {
    console.error('Error creating transporter:', error);
    throw new Error('Failed to create email transporter');
  }
};

/**
 * Send an email using OAuth2 authentication
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email content in HTML format
 * @param {string} [options.text] - Plain text version of the email
 * @returns {Promise} - Resolves when email is sent
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    // Validate required fields
    if (!to || !subject || !html) {
      throw new Error('Missing required email fields');
    }

    // Create transporter with OAuth2
    const transporter = await createTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || 'Kinovo <noreply@kinovo.app>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML if text version not provided
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Verify the email configuration on startup
const verifyEmailConfig = async () => {
  try {
    const transporter = await createTransporter();
    transporter.verify((error, success) => {
      if (error) {
        console.error('Email service configuration error:', error);
      } else {
        console.log('Email service is ready to send messages');
      }
    });
  } catch (error) {
    console.error('Failed to verify email configuration:', error);
  }
};

// Run verification during initialization
verifyEmailConfig();

module.exports = {
  sendEmail,
}; 