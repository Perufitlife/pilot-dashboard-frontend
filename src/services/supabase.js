// src/services/supabase.js
import { createClient } from '@supabase/supabase-js';

// Estas variables se tomarán del archivo .env que crearemos después
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;