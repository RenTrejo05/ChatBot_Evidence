require('dotenv').config();
const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes/chat');
const { connectDB } = require('./lib/mongodb');

const app = express();

app.use(cors());
app.use(express.json());

/**
 * Initializes the server by connecting to MongoDB,
 * setting up routes, and starting the Express app.
 */
(async () => {
  try {
    await connectDB();

    app.use('/api', chatRoutes);

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`Backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
})();
