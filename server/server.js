require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const Room = require('./models/Room');
const { seedDatabase } = require('./seed/seedData');

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',').map((s) => s.trim()) : true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' })
);
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/guests', require('./routes/guests'));
app.use('/api/checkin', require('./routes/checkin'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/settings', require('./routes/settings'));
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('your_mongodb_connection_string')) {
    console.error('\n[config] MONGODB_URI is not set. Open server/.env and add your MongoDB connection string.\n');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log('[db] Connected to MongoDB');
  } catch (err) {
    console.error('[db] Could not connect to MongoDB. Check MONGODB_URI and make sure the database is reachable.\n    ' + err.message);
    process.exit(1);
  }
  if ((await Room.countDocuments()) === 0) {
    console.log('[seed] Empty database detected - loading sample hotel data...');
    await seedDatabase();
    console.log('[seed] Sample data ready.');
  }
  app.listen(PORT, () => console.log(`[server] API running on http://localhost:${PORT}`));
}

start();
