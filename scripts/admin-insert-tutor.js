// scripts/admin-insert-tutor.js
// Usage: node scripts/admin-insert-tutor.js
// This script inserts a tutor row using the Supabase service role key (admin access).
// DO NOT commit your service role key to public repos!

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Load from environment variables
require('dotenv').config();
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function insertTutor() {
    const { data, error } = await supabase
        .from('tutor_information')
        .insert([
            {
                id: uuidv4(),
                name: 'Admin Test Tutor',
                rating: 5,
                total_sessions: 0,
                subjects: ['Mathematics'],
                qualifications: ['PhD'],
                is_favorite: false,
                is_online: true,
                credits_earned: 0,
                verified_document: 'https://example.com/doc.pdf'
            }
        ])
        .select(); // Return the inserted row
    if (error) {
        console.error('Insert error:', error);
    } else {
        console.log('Insert success:', data);
    }
}

insertTutor();
