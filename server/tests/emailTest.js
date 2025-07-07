require('dotenv').config();
const { sendEmail } = require('../utils/emailService');

async function testEmailService() {
  try {
    
    const result = await sendEmail({
      to: 'seyidli.mirhadi@gmail.com', // Replace with your email for testing
      subject: 'OAuth2 Email Test',
      html: '<h1>OAuth2 Test Email</h1><p>This is a test email sent using OAuth2 authentication with Gmail.</p>'
    });
    
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

testEmailService(); 