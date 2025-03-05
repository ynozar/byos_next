import postgres from 'postgres';
function transformPostgresUrl(postgresUrl: string | undefined): string {
  if (!postgresUrl) {
    throw new Error("Missing database connection URL");
  }
  try {
    const url = new URL(postgresUrl);

    // Extract username and password correctly
    const username = url.username;
    const password = url.password;

    // Construct the new URL format
    return `postgresql://${username}:${password}@${url.host}${url.pathname}`;
  } catch (error) {
    throw new Error("Invalid POSTGRES_URL format", { cause: error });
  }
}


const connectionString =
  transformPostgresUrl(process.env.POSTGRES_URL) || '';

if (!connectionString) {
  throw new Error('Missing database connection URL');
}

// Connect to Supabase database via Supavisor (Transaction Pooler)
const sql = postgres(connectionString, {
  ssl: 'require',
  prepare: false, // Supavisor does not support PREPARE statements
  connection: {
    application_name: 'nextjs-app',
  },
});

export default sql;