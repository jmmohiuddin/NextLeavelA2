"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const http_status_codes_1 = require("http-status-codes");
const config_1 = require("../config");
/**
 * requireAuth middleware — verifies the JWT in the Authorization header.
 * Spec says: Authorization: <token> (with or without "Bearer " prefix)
 * Attaches decoded payload (id, name, role) to req.user.
 */
const requireAuth = (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
        return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
            success: false,
            message: "Missing authentication token",
            errors: "Authorization header is required",
        });
    }
    // Accept both "Bearer <token>" and raw "<token>" formats
    const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;
    try {
        const payload = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        req.user = {
            id: payload.id,
            name: payload.name,
            role: payload.role,
        };
        return next();
    }
    catch {
        return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
            success: false,
            message: "Invalid or expired token",
            errors: "Authentication failed",
        });
    }
};
exports.requireAuth = requireAuth;
/**
 * requireRole middleware factory — checks that the authenticated user has the required role.
 * Use AFTER requireAuth.
 */
const requireRole = (role) => (req, res, next) => {
    if (!req.user) {
        return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
            success: false,
            message: "Missing authentication token",
            errors: "Authorization header is required",
        });
    }
    if (req.user.role !== role) {
        return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
            success: false,
            message: "Forbidden",
            errors: "Insufficient permissions",
        });
    }
    return next();
};
exports.requireRole = requireRole;
