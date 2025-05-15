// handlers/aiSummary.js
const { getAISummary } = require('../../controllers/aiController');

const handleAISummary = async (userId, ws) => {
  await getAISummary(userId, ws); // Stream assistant response
};

module.exports = { handleAISummary };