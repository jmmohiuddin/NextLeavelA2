"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
const config_1 = require("./config");
// Use DATABASE_URL connection string if provided (for cloud databases like NeonDB/Supabase)
// otherwise fall back to individual host/port/user/password/database fields
exports.pool = config_1.config.db.connectionString
    ? new pg_1.Pool({ connectionString: config_1.config.db.connectionString, ssl: { rejectUnauthorized: false } })
    : new pg_1.Pool({
        host: config_1.config.db.host,
        port: config_1.config.db.port,
        user: config_1.config.db.user,
        password: config_1.config.db.password,
        database: config_1.config.db.database,
    });
