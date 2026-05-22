"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = require("./modules/auth");
const issues_1 = require("./modules/issues");
const metrics_1 = require("./modules/metrics");
const errorHandler_1 = require("./middleware/errorHandler");
const http_status_codes_1 = require("http-status-codes");
exports.app = (0, express_1.default)();
// Parse incoming JSON bodies
exports.app.use(express_1.default.json());
// Route modules
exports.app.use("/api/auth", auth_1.authRouter);
exports.app.use("/api/issues", issues_1.issuesRouter);
exports.app.use("/api/metrics", metrics_1.metricsRouter);
// 404 handler — catch all unmatched routes
exports.app.use((_req, res) => {
    res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Route not found",
        errors: "Invalid endpoint",
    });
});
// Global error handler — must be last middleware
exports.app.use(errorHandler_1.errorHandler);
