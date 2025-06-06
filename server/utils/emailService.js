const nodemailer = require('nodemailer');

// Create a transporter using SMTP
// You should move these credentials to your .env file
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true' || false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email
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
transporter.verify((error, success) => {
  if (error) {
    console.error('Email service configuration error:', error);
  } else {
    console.log('Email service is ready to send messages');
  }
});

module.exports = {
  sendEmail,
}; 