const jwt = require('jsonwebtoken');
const axios = require('axios');
// const fs = require('fs');

// Load your .p8 key
// const privateKey = fs.readFileSync('../key/AuthKey_2K3C252Y66.p8');

// Replace these with your actual values
const TEAM_ID = process.env.APPLE_TEAM_ID;
const KEY_ID = process.env.APPLE_WEATHER_KEY_ID;
const SERVICE_ID = process.env.APPLE_BUNDLE_ID;
const privateKey = process.env.APPLE_WEATHER_PRIVATE_KEY.replace(/\\n/g, '\n');

const generateWeatherKitToken = () => {
  const now = Math.floor(Date.now() / 1000);
  const expires = now + 60 * 60; // 1 hour max

  return jwt.sign({ sub: SERVICE_ID }, 
    privateKey, 
    {
      issuer: TEAM_ID,
      expiresIn: expires,
      keyid: KEY_ID,
      algorithm: 'ES256',
      header: { id: `${TEAM_ID}.${SERVICE_ID}` },
  });
};

const getWeather = async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Missing lat or lon' });
  }

  const token = generateWeatherKitToken();

  try {
    const weatherRes = await axios.get(
      `https://weatherkit.apple.com/api/v1/weather/en/${lat}/${lon}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          dataSets: 'currentWeather',
        },
      }
    );

    res.json(weatherRes.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
};

module.exports = {
  getWeather
}