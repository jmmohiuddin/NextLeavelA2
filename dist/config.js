"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const saltRoundsRaw = process.env.BCRYPT_SALT_ROUNDS
    ? Number(process.env.BCRYPT_SALT_ROUNDS)
    : 10;
if (Number.isNaN(saltRoundsRaw) || saltRoundsRaw < 8 || saltRoundsRaw > 12) {
    throw new Error("BCRYPT_SALT_ROUNDS must be between 8 and 12");
}
exports.config = {
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    jwtSecret: process.env.JWT_SECRET || "",
    jwtExpiresIn: (process.env.JWT_EXPIRES_IN || "1d"),
    bcryptSaltRounds: saltRoundsRaw,
    db: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectionString: process.env.DATABASE_URL,
    },
};
