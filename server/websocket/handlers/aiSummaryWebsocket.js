// handlers/aiSummary.js
const handleAISummary = async (userId, ws) => {
  try {
    const summary = `AI summary for user ${userId}`;
    ws.send(JSON.stringify({ type: 'ai-summary-response', summary }));
  } catch (error) {
    console.error('AI summary error:', error.message);
    ws.send('[AI_SUMMARY_ERROR]');
  }
};

module.exports = { handleAISummary };