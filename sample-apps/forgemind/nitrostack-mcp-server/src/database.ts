import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/forgemind';
  try {
    await mongoose.connect(uri);
    console.log(`Connected to MongoDB at ${uri}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

const machineSchema = new mongoose.Schema({
  machine_id: { type: String, required: true, unique: true },
  name: String,
  status: String,
  location: String
});

const inventorySchema = new mongoose.Schema({
  part_id: { type: String, required: true, unique: true },
  name: String,
  stock_level: Number
});

const workOrderSchema = new mongoose.Schema({
  machine_id: String,
  issue_summary: String,
  status: { type: String, default: 'open' },
  created_at: { type: Date, default: Date.now },
  estimated_impact_downtime_min: Number
});

export const Machine = mongoose.models.Machine || mongoose.model('Machine', machineSchema);
export const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema);
export const WorkOrder = mongoose.models.WorkOrder || mongoose.model('WorkOrder', workOrderSchema);
