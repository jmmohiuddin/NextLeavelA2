"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const http_status_codes_1 = require("http-status-codes");
const db_1 = require("../db");
const config_1 = require("../config");
const validators_1 = require("../utils/validators");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post("/signup", async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Missing required fields",
                errors: "Name, email, and password are required",
            });
        }
        if (!(0, validators_1.isValidEmail)(email)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid email",
                errors: "Email format is invalid",
            });
        }
        const normalizedRole = role ?? "contributor";
        if (!(0, validators_1.isValidRole)(normalizedRole)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid role",
                errors: "Role must be contributor or maintainer",
            });
        }
        const existing = await db_1.pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (existing.rowCount && existing.rowCount > 0) {
            return res.status(http_status_codes_1.StatusCodes.CONFLICT).json({
                success: false,
                message: "Email already registered",
                errors: "Duplicate email",
            });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, config_1.config.bcryptSaltRounds);
        const result = await db_1.pool.query(`INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at, updated_at`, [name, email, hashedPassword, normalizedRole]);
        return res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: "User registered successfully",
            data: result.rows[0],
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.authRouter.post("/login", async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Missing credentials",
                errors: "Email and password are required",
            });
        }
        const result = await db_1.pool.query(`SELECT id, name, email, password, role, created_at, updated_at
       FROM users WHERE email = $1`, [email]);
        if (!result.rowCount) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: "Invalid credentials",
                errors: "Email or password is incorrect",
            });
        }
        const user = result.rows[0];
        const passwordMatch = await bcrypt_1.default.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: "Invalid credentials",
                errors: "Email or password is incorrect",
            });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, name: user.name, role: user.role }, config_1.config.jwtSecret, { expiresIn: config_1.config.jwtExpiresIn });
        const { password: _password, ...safeUser } = user;
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Login successful",
            data: {
                token,
                user: safeUser,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
