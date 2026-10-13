import fs from 'fs';
import path from 'path';
import { query } from './client';

async function seed() {
  console.log('Seeding database...');
  try {
    // 1. Drop existing tables and recreate schema
    const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split on '-- 1. restaurants' or just run it all at once if the user didn't want drop statements in schema
    // Since schema.sql doesn't have drop table, we'll manually drop them here
    await query(`
      DROP TABLE IF EXISTS logs CASCADE;
      DROP TABLE IF EXISTS ratings CASCADE;
      DROP TABLE IF EXISTS deliveries CASCADE;
      DROP TABLE IF EXISTS allocations CASCADE;
      DROP TABLE IF EXISTS calls CASCADE;
      DROP TABLE IF EXISTS donations CASCADE;
      DROP TABLE IF EXISTS executives CASCADE;
      DROP TABLE IF EXISTS ngos CASCADE;
      DROP TABLE IF EXISTS restaurants CASCADE;
      
      DROP TYPE IF EXISTS rated_type_enum CASCADE;
      DROP TYPE IF EXISTS delivery_status_enum CASCADE;
      DROP TYPE IF EXISTS allocation_status_enum CASCADE;
      DROP TYPE IF EXISTS call_response_enum CASCADE;
      DROP TYPE IF EXISTS call_status_enum CASCADE;
      DROP TYPE IF EXISTS donation_status_enum CASCADE;
      DROP TYPE IF EXISTS veg_nonveg_enum CASCADE;
      DROP TYPE IF EXISTS preferred_language_enum CASCADE;
    `);
    
    console.log('Executing schema.sql...');
    await query(schemaSql);
    
    // 2. Insert Restaurants
    console.log('Inserting restaurants...');
    const res = await query(`
      INSERT INTO restaurants (name, phone, lat, lng, rating_avg) VALUES
      ('Ananda Bhavan', '+919876543210', 13.0827, 80.2707, 4.5),
      ('Spice Route', '+919876543211', 13.0850, 80.2750, 4.2),
      ('Biryani Mahal', '+919876543212', 13.0900, 80.2800, 4.8),
      ('Healthy Bites', '+919876543213', 13.0810, 80.2710, 4.0)
      RETURNING id;
    `);
    
    // 3. Insert NGOs
    console.log('Inserting NGOs...');
    await query(`
      INSERT INTO ngos (name, phone, preferred_language, lat, lng, reliability_score, capacity) VALUES
      ('Feeding Hands', '+919876500001', 'en', 13.0830, 80.2710, 0.9, 100),
      ('Anbu Illam', '+919876500002', 'ta', 13.0840, 80.2720, 0.85, 50),
      ('Asha Foundation', '+919876500003', 'hi', 13.0850, 80.2730, 0.95, 200),
      ('Karunai Trust', '+919876500004', 'ta', 13.0860, 80.2740, 0.7, 75),
      ('Hope Society', '+919876500005', 'te', 13.0870, 80.2750, 0.8, 150),
      ('Helping Hearts', '+919876500006', 'en', 13.0880, 80.2760, 0.88, 120),
      ('Sneha Seva', '+919876500007', 'hi', 13.0890, 80.2770, 0.92, 80),
      ('Real Phone Test NGO', '+911234567890', 'ta', 13.0820, 80.2705, 0.99, 500),
      ('Global Relief', '+919876500008', 'en', 13.0900, 80.2780, 0.75, 60),
      ('Jeevan Jyothi', '+919876500009', 'te', 13.0910, 80.2790, 0.82, 90),
      ('Care Connect', '+919876500010', 'hi', 13.0920, 80.2800, 0.89, 110),
      ('Makkal Sevai', '+919876500011', 'ta', 13.0930, 80.2810, 0.91, 140)
    `);

    // 4. Insert Executives
    console.log('Inserting Executives...');
    await query(`
      INSERT INTO executives (name, phone, lat, lng, available, rating_avg) VALUES
      ('Ravi Kumar', '+919876550001', 13.0825, 80.2705, true, 4.7),
      ('Suresh Babu', '+919876550002', 13.0845, 80.2725, true, 4.3),
      ('Manoj Singh', '+919876550003', 13.0865, 80.2745, true, 4.9),
      ('Venkat Raj', '+919876550004', 13.0885, 80.2765, true, 4.5),
      ('Karthik N', '+919876550005', 13.0905, 80.2785, true, 4.6),
      ('Arun Prakash', '+919876550006', 13.0925, 80.2805, false, 4.2)
    `);

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    process.exit(0);
  }
}

seed();
