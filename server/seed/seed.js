// Re-creates the sample hotel data from scratch:  npm run seed
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { seedDatabase } = require('./seedData');

(async () => {
  if (!process.env.MONGODB_URI) { console.error('MONGODB_URI is missing in server/.env'); process.exit(1); }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    const summary = await seedDatabase();
    console.log('Sample data loaded:', summary);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
