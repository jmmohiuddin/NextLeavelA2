"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.issuesRouter = void 0;
const express_1 = require("express");
const http_status_codes_1 = require("http-status-codes");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const validators_1 = require("../utils/validators");
exports.issuesRouter = (0, express_1.Router)();
const buildReporterMap = async (reporterIds) => {
    if (reporterIds.length === 0) {
        return new Map();
    }
    const uniqueIds = Array.from(new Set(reporterIds));
    const result = await db_1.pool.query("SELECT id, name, role FROM users WHERE id = ANY($1)", [uniqueIds]);
    return new Map(result.rows.map((row) => [row.id, row]));
};
exports.issuesRouter.post("/", auth_1.requireAuth, async (req, res, next) => {
    try {
        const { title, description, type } = req.body;
        if (!title || !description || !type) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Missing required fields",
                errors: "Title, description, and type are required",
            });
        }
        if (title.length > 150) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid title",
                errors: "Title must be 150 characters or fewer",
            });
        }
        if (description.length < 20) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid description",
                errors: "Description must be at least 20 characters",
            });
        }
        if (!(0, validators_1.isValidIssueType)(type)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid type",
                errors: "Type must be bug or feature_request",
            });
        }
        const reporterId = req.user?.id;
        if (!reporterId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: "Unauthorized",
                errors: "Invalid user context",
            });
        }
        const result = await db_1.pool.query(`INSERT INTO issues (title, description, type, reporter_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, description, type, status, reporter_id, created_at, updated_at`, [title, description, type, reporterId]);
        return res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: "Issue created successfully",
            data: result.rows[0],
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.issuesRouter.get("/", async (req, res, next) => {
    try {
        const { sort, type, status } = req.query;
        const sortValue = sort ?? "newest";
        if (sortValue !== "newest" && sortValue !== "oldest") {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid sort parameter",
                errors: "Sort must be newest or oldest",
            });
        }
        if (type && !(0, validators_1.isValidIssueType)(type)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid type filter",
                errors: "Type must be bug or feature_request",
            });
        }
        if (status && !(0, validators_1.isValidIssueStatus)(status)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid status filter",
                errors: "Status must be open, in_progress, or resolved",
            });
        }
        const where = [];
        const values = [];
        if (type) {
            values.push(type);
            where.push(`type = $${values.length}`);
        }
        if (status) {
            values.push(status);
            where.push(`status = $${values.length}`);
        }
        const orderBy = sortValue === "oldest" ? "ASC" : "DESC";
        const query = `
      SELECT id, title, description, type, status, reporter_id, created_at, updated_at
      FROM issues
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY created_at ${orderBy}
    `;
        const issuesResult = await db_1.pool.query(query, values);
        const reporterMap = await buildReporterMap(issuesResult.rows.map((row) => row.reporter_id));
        const data = issuesResult.rows.map((issue) => ({
            id: issue.id,
            title: issue.title,
            description: issue.description,
            type: issue.type,
            status: issue.status,
            reporter: reporterMap.get(issue.reporter_id) || null,
            created_at: issue.created_at,
            updated_at: issue.updated_at,
        }));
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.issuesRouter.get("/:id", async (req, res, next) => {
    try {
        const issueId = Number(req.params.id);
        if (Number.isNaN(issueId)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid issue id",
                errors: "Issue id must be a number",
            });
        }
        const issueResult = await db_1.pool.query(`SELECT id, title, description, type, status, reporter_id, created_at, updated_at
       FROM issues WHERE id = $1`, [issueId]);
        if (!issueResult.rowCount) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Issue not found",
                errors: "No issue exists with the provided id",
            });
        }
        const issue = issueResult.rows[0];
        const reporterResult = await db_1.pool.query("SELECT id, name, role FROM users WHERE id = $1", [issue.reporter_id]);
        const reporter = reporterResult.rows[0] || null;
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: {
                id: issue.id,
                title: issue.title,
                description: issue.description,
                type: issue.type,
                status: issue.status,
                reporter,
                created_at: issue.created_at,
                updated_at: issue.updated_at,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.issuesRouter.patch("/:id", auth_1.requireAuth, async (req, res, next) => {
    try {
        const issueId = Number(req.params.id);
        if (Number.isNaN(issueId)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid issue id",
                errors: "Issue id must be a number",
            });
        }
        const issueResult = await db_1.pool.query(`SELECT id, reporter_id, status FROM issues WHERE id = $1`, [issueId]);
        if (!issueResult.rowCount) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Issue not found",
                errors: "No issue exists with the provided id",
            });
        }
        const issue = issueResult.rows[0];
        const isMaintainer = req.user?.role === "maintainer";
        if (!isMaintainer) {
            if (req.user?.id !== issue.reporter_id) {
                return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                    success: false,
                    message: "Forbidden",
                    errors: "Only the reporter can update this issue",
                });
            }
            if (issue.status !== "open") {
                return res.status(http_status_codes_1.StatusCodes.CONFLICT).json({
                    success: false,
                    message: "Issue cannot be updated",
                    errors: "Only open issues can be updated by contributors",
                });
            }
        }
        const { title, description, type, status } = req.body;
        const updates = [];
        const values = [];
        if (title !== undefined) {
            if (!title) {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Invalid title",
                    errors: "Title cannot be empty",
                });
            }
            if (title.length > 150) {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Invalid title",
                    errors: "Title must be 150 characters or fewer",
                });
            }
            values.push(title);
            updates.push(`title = $${values.length}`);
        }
        if (description !== undefined) {
            if (!description) {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Invalid description",
                    errors: "Description cannot be empty",
                });
            }
            if (description.length < 20) {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Invalid description",
                    errors: "Description must be at least 20 characters",
                });
            }
            values.push(description);
            updates.push(`description = $${values.length}`);
        }
        if (type !== undefined) {
            if (!(0, validators_1.isValidIssueType)(type)) {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Invalid type",
                    errors: "Type must be bug or feature_request",
                });
            }
            values.push(type);
            updates.push(`type = $${values.length}`);
        }
        if (status !== undefined) {
            if (!isMaintainer) {
                return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                    success: false,
                    message: "Forbidden",
                    errors: "Only maintainers can update status",
                });
            }
            if (!(0, validators_1.isValidIssueStatus)(status)) {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Invalid status",
                    errors: "Status must be open, in_progress, or resolved",
                });
            }
            values.push(status);
            updates.push(`status = $${values.length}`);
        }
        if (updates.length === 0) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "No fields to update",
                errors: "Provide at least one valid field",
            });
        }
        updates.push("updated_at = NOW()");
        const updateQuery = `
      UPDATE issues
      SET ${updates.join(", ")}
      WHERE id = $${values.length + 1}
      RETURNING id, title, description, type, status, reporter_id, created_at, updated_at
    `;
        const updated = await db_1.pool.query(updateQuery, [...values, issueId]);
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Issue updated successfully",
            data: updated.rows[0],
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.issuesRouter.delete("/:id", auth_1.requireAuth, async (req, res, next) => {
    try {
        if (req.user?.role !== "maintainer") {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                success: false,
                message: "Forbidden",
                errors: "Only maintainers can delete issues",
            });
        }
        const issueId = Number(req.params.id);
        if (Number.isNaN(issueId)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid issue id",
                errors: "Issue id must be a number",
            });
        }
        const result = await db_1.pool.query("DELETE FROM issues WHERE id = $1 RETURNING id", [issueId]);
        if (!result.rowCount) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Issue not found",
                errors: "No issue exists with the provided id",
            });
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Issue deleted successfully",
        });
    }
    catch (error) {
        return next(error);
    }
});
