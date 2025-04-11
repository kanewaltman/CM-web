import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Hard-coded values from .env for testing
const supabaseUrl = 'https://magvpoutwgstjuofeykl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hZ3Zwb3V0d2dzdGp1b2ZleWtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1OTMyMjcsImV4cCI6MjA1NDE2OTIyN30.pWbE1bDGoULQ29xhnXYDNupB7o8rs3pG1kZ5MYgVR6A';

// For production, would use:
// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey); 