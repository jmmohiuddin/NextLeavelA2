"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsRouter = void 0;
const express_1 = require("express");
const http_status_codes_1 = require("http-status-codes");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
exports.metricsRouter = (0, express_1.Router)();
exports.metricsRouter.get("/", auth_1.requireAuth, async (req, res, next) => {
    try {
        if (req.user?.role !== "maintainer") {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                success: false,
                message: "Forbidden",
                errors: "Only maintainers can access metrics",
            });
        }
        const usersResult = await db_1.pool.query("SELECT COUNT(*) FROM users");
        const issuesResult = await db_1.pool.query("SELECT COUNT(*) FROM issues");
        const openResult = await db_1.pool.query("SELECT COUNT(*) FROM issues WHERE status = $1", ["open"]);
        const inProgressResult = await db_1.pool.query("SELECT COUNT(*) FROM issues WHERE status = $1", ["in_progress"]);
        const resolvedResult = await db_1.pool.query("SELECT COUNT(*) FROM issues WHERE status = $1", ["resolved"]);
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: {
                users: Number(usersResult.rows[0].count),
                issues: Number(issuesResult.rows[0].count),
                status: {
                    open: Number(openResult.rows[0].count),
                    in_progress: Number(inProgressResult.rows[0].count),
                    resolved: Number(resolvedResult.rows[0].count),
                },
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
