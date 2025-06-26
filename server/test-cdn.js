const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:5002';
const TEST_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token
const TEST_IMAGE_PATH = './test-image.jpg'; // Create a test image file

async function testCDNSystem() {
  console.log('🚀 Testing CDN Image Upload System...\n');

  try {
    // Test 1: Get CDN Info
    console.log('1️⃣  Testing CDN Info endpoint...');
    const infoResponse = await axios.get(`${BASE_URL}/api/storage/info`, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` }
    });
    
    if (infoResponse.data.success) {
      console.log('✅ CDN Info endpoint working');
      console.log('   CDN Domain:', infoResponse.data.data.cdnDomain);
      console.log('   Max File Size:', infoResponse.data.data.maxFileSize);
    } else {
      console.log('❌ CDN Info endpoint failed');
      return;
    }

    // Test 2: Check if test image exists
    console.log('\n2️⃣  Checking test image...');
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      console.log('❌ Test image not found. Please create a test image at:', TEST_IMAGE_PATH);
      console.log('   You can download any JPEG image and save it as test-image.jpg');
      return;
    }
    console.log('✅ Test image found');

    // Test 3: Upload Profile Picture
    console.log('\n3️⃣  Testing profile picture upload...');
    const formData = new FormData();
    formData.append('profilePicture', fs.createReadStream(TEST_IMAGE_PATH));

    const uploadResponse = await axios.post(
      `${BASE_URL}/api/storage/upload/profile-picture`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${TEST_TOKEN}`
        }
      }
    );

    if (uploadResponse.data.success) {
      console.log('✅ Profile picture upload successful');
      console.log('   CDN URL:', uploadResponse.data.data.url);
      console.log('   S3 Key:', uploadResponse.data.data.key);

      // Test 4: Verify image is accessible
      console.log('\n4️⃣  Testing CDN image access...');
      const imageUrl = uploadResponse.data.data.url;
      
      try {
        const imageResponse = await axios.head(imageUrl);
        if (imageResponse.status === 200) {
          console.log('✅ Image accessible via CDN');
          console.log('   Content Type:', imageResponse.headers['content-type']);
          console.log('   Content Length:', imageResponse.headers['content-length']);
        }
      } catch (error) {
        console.log('⚠️  Image not yet accessible via CDN (may take a few minutes for CloudFront)');
        console.log('   Try accessing manually:', imageUrl);
      }

      // Test 5: Get User Images
      console.log('\n5️⃣  Testing get user images...');
      const userImagesResponse = await axios.get(`${BASE_URL}/api/users/images`, {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` }
      });

      if (userImagesResponse.data.success) {
        console.log('✅ User images retrieved');
        console.log('   Profile Picture:', userImagesResponse.data.data.profilePicture);
        console.log('   Cover Photo:', userImagesResponse.data.data.coverPhoto);
      }

    } else {
      console.log('❌ Profile picture upload failed');
      console.log('   Error:', uploadResponse.data.message);
    }

  } catch (error) {
    console.log('❌ Test failed with error:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Message:', error.response.data?.message || error.response.statusText);
    } else {
      console.log('   Error:', error.message);
    }
  }

  console.log('\n🏁 CDN Test Complete');
}

// Helper function to create a test image if needed
function createTestImage() {
  console.log('Creating a simple test image...');
  
  // Create a simple 100x100 red square PNG using Buffer
  const width = 100;
  const height = 100;
  const channels = 3; // RGB
  
  // Create a simple red image buffer
  const buffer = Buffer.alloc(width * height * channels);
  for (let i = 0; i < buffer.length; i += channels) {
    buffer[i] = 255;     // Red
    buffer[i + 1] = 0;   // Green
    buffer[i + 2] = 0;   // Blue
  }
  
  console.log('❌ Cannot create test image automatically.');
  console.log('📝 Please manually create a test image:');
  console.log('   1. Download any JPEG image from the internet');
  console.log('   2. Save it as "test-image.jpg" in the server directory');
  console.log('   3. Run this test again');
}

// Check if we should create a test image
if (process.argv.includes('--create-test-image')) {
  createTestImage();
} else {
  testCDNSystem();
}

console.log('\n📖 Usage:');
console.log('   node test-cdn.js                 # Run the test');
console.log('   node test-cdn.js --create-test-image # Get help creating test image');
console.log('\n⚠️  Remember to:');
console.log('   1. Replace YOUR_JWT_TOKEN_HERE with a real JWT token');
console.log('   2. Ensure the server is running on port 5002');
console.log('   3. Have a test-image.jpg file in the server directory'); 