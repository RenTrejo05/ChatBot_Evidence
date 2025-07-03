const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mediTime';

// Use connection pooling and recommended options
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,
  maxPoolSize: 10,
  useUnifiedTopology: true
});

let dbInstance = null;

/**
 * Connects to MongoDB and returns the database instance.
 * Uses a singleton pattern to reuse the connection.
 */
async function connectDB() {
  if (dbInstance) return dbInstance;
  try {
    await client.connect();
    dbInstance = client.db(); // Uses DB name from URI
    console.log('Connected to MongoDB:', dbInstance.databaseName);
    return dbInstance;
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    throw err; // Let the caller handle the error
  }
}

// Gracefully close the connection on process termination
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
  process.exit(0);
});

module.exports = { connectDB };
