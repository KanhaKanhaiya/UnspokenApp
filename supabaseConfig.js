import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
	// Avoid Metro crash when env vars are missing; warn and create client with empty values
	// (Requests will fail but Metro won't crash with an undefined argument.)
	// Make sure to create a .env file in project root with the required keys.
	// Example: EXPO_PUBLIC_SUPABASE_URL=... EXPO_PUBLIC_SUPABASE_KEY=...
	// This warning is intentional to help debugging during development.
	// eslint-disable-next-line no-console
	console.warn('Missing Supabase env vars: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY in .env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)