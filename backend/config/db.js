import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/proctored-exam-platform', {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,  // Ping Atlas every 10s to prevent idle timeout
      maxIdleTimeMS: 270000,        // Keep idle connections alive for 4.5 minutes
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Auto-reconnect if Atlas drops the connection mid-session
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting reconnect in 5s...');
      setTimeout(connectDB, 5000);
    });

  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    console.log('Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};
