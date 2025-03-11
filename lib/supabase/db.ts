// import { createClient } from '@/lib/supabase/server';

// import postgres from 'postgres';

// if (!connectionString) {
//   throw new Error('Missing database connection URL');
// }

// // Connect to Supabase database via Supavisor (Transaction Pooler)
// const sql = postgres(connectionString, {
//   ssl: 'require',
//   prepare: false, // Supavisor does not support PREPARE statements
//   connection: {
//     application_name: 'nextjs-app',
//   },
// });

// export default sql;

/**
 * Database Setup Process
 *
 * Flow:
 * 1. Check if Supabase API variables (SUPABASE_URL and SUPABASE_ANON_KEY) are set.
 *    - If not, display manual instructions to get these values from the Supabase dashboard.
 * 2. If API variables exist, perform a schema check by running a query on the expected tables.
 *    - If the query succeeds, the database schema is correct and the app can run normally.
 *    - If the query fails:
 *        a. Check if POSTGRES_URL exists and is valid.
 *            - If POSTGRES_URL exists, prompt to run the SQL script for them.
 *            - If POSTGRES_URL is missing, prompt to run the SQL script manually.
 */

/**
 * Checks if the database is properly configured and ready for use
 * @returns Object containing database readiness status and additional information
 */
// export async function isDatabaseReady(): Promise<{
//   ready: boolean;
//   error?: string;
//   dataText?: string;
// }> {
//   // Step 1: Check if Supabase API environment variables are present
//   const hasSupabaseAPI = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;

//   if (!hasSupabaseAPI) {
//     // Supabase API variables missing: cannot perform a schema check
//     console.log("Supabase API variables (SUPABASE_URL and/or SUPABASE_ANON_KEY) are missing.");
//     console.log("Please obtain these from your Supabase dashboard and set them.");
//     return { ready: false, error: 'SUPABASE_API_ENV_VARS_MISSING' };
//   }

//   // Step 2: Perform a schema check to see if the expected tables exist
//   try {
//     const schemaReady = await checkDatabaseSchema();
//     if (schemaReady) {
//       // The schema is correct; the app is ready to run
//       console.log("Database schema verified. The app is ready to run.");
//       return { ready: true };
//     }
//   } catch (error) {
//     console.error("Error checking database schema:", error);
//   }

//   console.log("Schema check failed, checking if we can run the SQL script");

//   // Step 3: Check if POSTGRES_URL is available for database initialization
//   if (!process.env.POSTGRES_URL) {
//     return { ready: false, error: 'PROMPT_USER_TO_RUN_SQL_SCRIPT_MANUALLY' };
//   }

//   try {
//     const url = new URL(process.env.POSTGRES_URL);

//     // Extract username and password
//     const username = url.username;
//     const password = url.password;

//     // Construct the connection string
//     return {
//       ready: false,
//       error: 'SHOW_USER_DATABASE_INITIALISATION_UI',
//       dataText: `postgresql://${username}:${password}@${url.host}${url.pathname}`
//     };
//   } catch (error) {
//     console.error("Error parsing POSTGRES_URL:", error);
//     return { ready: false, error: 'PROMPT_USER_TO_RUN_SQL_SCRIPT_MANUALLY' };
//   }
// }

// /**
//  * Checks if the required tables exist in the database
//  * @returns Boolean indicating if the schema is properly set up
//  */
// async function checkDatabaseSchema(): Promise<boolean> {
//   try {
//     const { supabase } = await createClient();
//     const { data, error } = await supabase
//       .from('information_schema.tables')
//       .select('table_name')
//       .eq('table_schema', 'public')
//       .in('table_name', ['devices', 'logs', 'system_logs']);

//     if (error) {
//       console.error("Error querying database schema:", error);
//       return false;
//     }

//     // Check if all three required tables exist
//     return data && data.length === 3;
//     // Note: we are only checking if the tables exist, not if they have the correct structure
//     // This prioritizes speed of check over complete correctness
//     // The user has the option to reinitialize the database via the maintenance page if needed
//   } catch (error) {
//     console.error("Error during schema check:", error);
//     return false;
//   }
// }

/**
 * Runs the SQL script to initialize the database
 * @returns Boolean indicating if the initialization was successful
 */
// export async function runDatabaseInitialization(): Promise<boolean> {
//   try {
//     // Implementation would go here to execute the SQL initialization script
//     // using the POSTGRES_URL connection string

//     // For now, this is a placeholder
//     console.log("Database initialization would run here");
//     return true;
//   } catch (error) {
//     console.error("Error initializing database:", error);
//     return false;
//   }
// }

// // Run the main setup process.
// mainSetup();
