import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("ERROR: MONGODB_URI is not set in your .env file!");
  process.exit(1);
}

mongoose.connect(uri)
  .then(async () => {
    console.log("Successfully connected to MongoDB Atlas!");
    
    // Import the User schema
    const { UserModel } = await import('./src/modules/auth/schemas/user.schema.js');
    
    // Create the admin user
    const hash = crypto.createHash('sha256').update('admin123').digest('hex');
    await UserModel.deleteMany({ username: 'admin' });
    await UserModel.create({ username: 'admin', passwordHash: hash, role: 'admin' });
    
    console.log('Admin user (username: admin, password: admin123) created successfully!');
    process.exit(0);
  })
  .catch(e => {
    console.error('Connection failed:', e);
    process.exit(1);
  });
