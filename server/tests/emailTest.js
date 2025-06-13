require('dotenv').config();
const { sendEmail } = require('../utils/emailService');

async function testEmailService() {
  try {
    console.log('Testing email service with OAuth2 authentication...');
    
    const result = await sendEmail({
      to: 'seyidli.mirhadi@gmail.com', // Replace with your email for testing
      subject: 'OAuth2 Email Test',
      html: '<h1>OAuth2 Test Email</h1><p>This is a test email sent using OAuth2 authentication with Gmail.</p>'
    });
    
    console.log('Email sent successfully!');
    console.log('Message ID:', result.messageId);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

testEmailService(); 