require('dotenv').config();
const mongoose = require('mongoose');

main().catch(err => console.error(err));

async function main() {
  mongoose.connect(process.env.MONGODB_URI, {})
    .then(() => {
      console.log('Connected to MongoDB');
    })
}

const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => {});
