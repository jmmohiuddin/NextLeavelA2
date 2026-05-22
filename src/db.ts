import { Pool } from "pg";
import { config } from "./config";

// Use DATABASE_URL connection string if provided (for cloud databases like NeonDB/Supabase)
// otherwise fall back to individual host/port/user/password/database fields
export const pool = config.db.connectionString
  ? new Pool({ connectionString: config.db.connectionString, ssl: { rejectUnauthorized: false } })
  : new Pool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
    });
