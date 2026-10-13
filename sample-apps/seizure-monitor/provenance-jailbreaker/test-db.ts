import mongoose from "mongoose";
import { AuditEntryModel } from "./src/modules/audit/schemas/audit-entry.schema.js";

async function run() {
  await mongoose.connect("mongodb+srv://yashcambridge_db_user:OEohLJjmYVbWkZb9@cluster0.cpg1ns9.mongodb.net/?appName=Cluster0");
  const docs = await AuditEntryModel.find().sort({sequence: -1}).limit(5).lean();
  console.log("Sequences from DB via Mongoose:", docs.map(d => d.sequence));
  await mongoose.disconnect();
}
run().catch(console.error);
