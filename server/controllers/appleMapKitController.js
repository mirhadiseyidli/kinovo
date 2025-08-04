const mapKitService = require('../services/appleMapKitService');

const generateMapSnapshot = async (req, res) => {
  try {
    const { lat, lon, ...options } = req.body;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing lat or lon' });
    }

    const imageBuffer = await mapKitService.getSnapshot({ lat, lon, ...options });

    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400'
    });

    res.send(imageBuffer);

  } catch (error) {
    console.error('MapKit snapshot error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to generate map snapshot',
      details: error.response?.data || error.message
    });
  }
};

const generateMapSnapshotUrl = async (req, res) => {
  try {
    const { lat, lon, ...options } = req.body;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing lat or lon' });
    }

    const url = mapKitService.buildSnapshotUrl({ lat, lon, ...options });
    const token = await mapKitService.getMapsToken();

    res.json({
      url: url,
      token: token,
      expiresIn: 3600
    });

  } catch (error) {
    console.error('MapKit snapshot URL generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate map snapshot URL',
      details: error.message
    });
  }
};

const generateMapSnapshotUrls = async (req, res) => {
  try {
    const { lat, lon, ...options } = req.body;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing lat or lon' });
    }

    // Generate signed URLs for both light and dark themes
    const lightUrl = await mapKitService.buildSignedSnapshotUrl({ 
      lat, 
      lon, 
      colorScheme: 'light',
      ...options 
    });
    
    const darkUrl = await mapKitService.buildSignedSnapshotUrl({ 
      lat, 
      lon, 
      colorScheme: 'dark',
      ...options 
    });

    res.json({
      light: lightUrl,
      dark: darkUrl
    });

  } catch (error) {
    console.error('MapKit snapshot URLs generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate map snapshot URLs',
      details: error.message
    });
  }
};

const generateMapSnapshotAndUpload = async (req, res) => {
  try {
    const { lat, lon, eventId, ...options } = req.body;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing lat or lon' });
    }

    const result = await mapKitService.getSnapshotAndUploadToS3({ 
      lat, 
      lon, 
      eventId,
      ...options 
    });

    res.json(result);

  } catch (error) {
    console.error('MapKit snapshot upload error:', error);
    res.status(500).json({ 
      error: 'Failed to generate and upload map snapshot',
      details: error.message
    });
  }
};

module.exports = {
  generateMapSnapshot,
  generateMapSnapshotUrl,
  generateMapSnapshotUrls,
  generateMapSnapshotAndUpload
};