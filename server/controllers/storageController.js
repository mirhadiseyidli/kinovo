// server/controllers/storageController.js
const { admin } = require('../config/firebase-admin');
const bucket = admin.storage().bucket();
const { v4: uuidv4 } = require('uuid');

/**
 * Upload file to Firebase Storage
 * @route POST /api/storage/upload
 * @access Private
 */
// const uploadImage = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ message: 'No file uploaded' });
//     }
    
//     const userId = req.user._id;
//     const fileExt = req.file.originalname.split('.').pop();
//     const fileName = `${userId}/${uuidv4()}.${fileExt}`;
    
//     const file = bucket.file(fileName);
//     const fileBuffer = req.file.buffer;
    
//     await file.save(fileBuffer, {
//       metadata: {
//         contentType: req.file.mimetype,
//         metadata: {
//           uploadedBy: userId.toString(),
//           originalName: req.file.originalname
//         }
//       }
//     });
    
//     // Make the file publicly readable (or use signed URLs for more security)
//     await file.makePublic();
    
//     const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
//     res.status(200).json({ url, fileName });
//   } catch (error) {
//     console.error('Error uploading file:', error);
//     res.status(500).json({ message: 'Server error during file upload' });
//   }
// };

/**
 * Get a signed URL for a file
 * @route GET /api/storage/url/:filename
 * @access Private
 */
const getSignedUrl = async (req, res) => {
  try {
    const fileName = req.params.filename;
    const userId = req.user._id;
    
    const file = bucket.file(`${userId}/${fileName}`);
    const exists = await file.exists();
    
    if (!exists[0]) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });
    
    res.status(200).json({ url });
  } catch (error) {
    console.error('Error getting signed URL:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a file
 * @route DELETE /api/storage/:filename
 * @access Private
 */
const deleteFile = async (req, res) => {
  try {
    const fileName = req.params.filename;
    const userId = req.user._id;
    
    const file = bucket.file(`${userId}/${fileName}`);
    const exists = await file.exists();
    
    if (!exists[0]) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    await file.delete();
    
    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Server error during file deletion' });
  }
};

module.exports = { getSignedUrl, deleteFile };