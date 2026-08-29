import mongoose from 'mongoose';
import { config } from './env.js';

export const connectDatabase = async () => {
  try {
    const mongoUri = config.mongoUri || 'mongodb://localhost:27017/vulnixai';
    
    console.log('🔄 Connecting to MongoDB...');
    console.log(`📍 URI: ${mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//*****:*****@')}`); // Hide credentials in logs
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
      socketTimeoutMS: 5000,
      family: 4, // Use IPv4, skip trying IPv6
    });
    
    console.log('✅ MongoDB connected successfully');
    console.log(`📦 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
  } catch (error: any) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('💡 Please check:');
    console.error('   1. MongoDB URI is correct');
    console.error('   2. MongoDB cluster is running');
    console.error('   3. Network access is allowed from this IP');
    console.error('   4. Database user credentials are correct');
    
    // Run the app even if DB connection is unavailable
    console.error('⚠️  Running without database connection in offline/development mode!');
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB error:', error);
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});
