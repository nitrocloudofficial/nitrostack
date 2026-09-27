import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env file.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadData() {
  try {
    // 1. Upload patients
    console.log("Loading patients from JSON...");
    const patients = JSON.parse(fs.readFileSync('fixtures/parsed_patients.json', 'utf8'));
    console.log(`Loaded ${patients.length} patients. Uploading in batches...`);
    
    // Batch upsert to patients table
    const patientBatchSize = 100;
    for (let i = 0; i < patients.length; i += patientBatchSize) {
      const batch = patients.slice(i, i + patientBatchSize);
      const { error } = await supabase
        .from('patients')
        .upsert(batch, { onConflict: 'patient_id' });
      
      if (error) {
        console.error(`Error uploading patient batch starting at ${i}:`, error.message);
      } else {
        console.log(`Uploaded patients ${i} to ${Math.min(patients.length, i + patientBatchSize)}`);
      }
    }

    // 2. Upload interaction rules
    console.log("Loading rules from JSON...");
    const rules = JSON.parse(fs.readFileSync('fixtures/parsed_rules.json', 'utf8'));
    console.log(`Loaded ${rules.length} interaction rules. Uploading in batches...`);
    
    // Batch upsert to interaction_rules table
    // Wait, let's clear the old interaction rules if we want to refresh it, or just upsert them.
    // Since interaction_rules has no unique constraint, to prevent duplicates, we can truncate the table or delete all existing rules before inserting the 800 rules!
    // Yes! Let's delete all existing rules first to make sure we don't duplicate rules on multiple runs!
    console.log("Deleting old interaction rules...");
    const { error: deleteError } = await supabase
      .from('interaction_rules')
      .delete()
      .neq('id', 0); // deletes all
      
    if (deleteError) {
      console.warn("Could not delete old rules:", deleteError.message);
    }
    
    const ruleBatchSize = 100;
    for (let i = 0; i < rules.length; i += ruleBatchSize) {
      const batch = rules.slice(i, i + ruleBatchSize);
      const { error } = await supabase
        .from('interaction_rules')
        .insert(batch);
      
      if (error) {
        console.error(`Error uploading rules batch starting at ${i}:`, error.message);
      } else {
        console.log(`Uploaded rules ${i} to ${Math.min(rules.length, i + ruleBatchSize)}`);
      }
    }

    console.log("Data upload complete!");
  } catch (err) {
    console.error("Upload failed with error:", err);
  }
}

uploadData();
