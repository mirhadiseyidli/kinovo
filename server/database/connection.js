require('dotenv').config();
const mongoose = require('mongoose');
const { initWebSocket } = require('../websocket/websocket');

main().catch(err => console.log(err));

async function main() {
  mongoose.connect(process.env.MONGODB_URI, {})
    .then(() => {
      initWebSocket();
    })
}

const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('Connected to Database'));
