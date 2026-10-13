import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ecpokyzflpqwbgeewsfd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjcG9reXpmbHBxd2JnZWV3c2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODQyMTUsImV4cCI6MjEwMDU2MDIxNX0.Nrsn7QssfcYqOPj19-Gg9U_GYkPijw-jmPkTrUp1Duo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
