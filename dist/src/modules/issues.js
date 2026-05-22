"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.issuesRouter = void 0;
const express_1 = require("express");
const http_status_codes_1 = require("http-status-codes");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const validators_1 = require("../utils/validators");
exports.issuesRouter = (0, express_1.Router)();
// Helper: fetch reporter data for a batch of reporter IDs without JOINs
const buildReporterMap = async (reporterIds) => {
    if (reporterIds.length === 0) {
        return new Map();
    }
    // Use WHERE id = ANY(...) to batch-fetch reporters without SQL JOINs
    const uniqueIds = Array.from(new Set(reporterIds));
    const result = await db_1.pool.query("SELECT id, name, role FROM users WHERE id = ANY($1)", [uniqueIds]);
    return new Map(result.rows.map((row) => [row.id, row]));
};
// POST /api/issues — Create a new issue (authenticated)
exports.issuesRouter.post("/", auth_1.requireAuth, async (req, res, next) => {
    try {
        const { title, description, type } = req.body;
        // Validate required fields
        if (!title || !description || !type) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Missing required fields",
                errors: "Title, description, and type are required",
            });
        }
        // title: max 150 characters
        if (title.length > 150) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid title",
                errors: "Title must be 150 characters or fewer",
            });
        }
        // description: minimum 20 characters
        if (description.length < 20) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid description",
                errors: "Description must be at least 20 characters",
            });
        }
        // type: must be bug or feature_request
        if (!(0, validators_1.isValidIssueType)(type)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid type",
                errors: "Type must be bug or feature_request",
            });
        }
        // reporter_id comes from the decoded JWT (req.user.id), not request body
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
// GET /api/issues — Retrieve all issues with optional sorting and filtering (public)
exports.issuesRouter.get("/", async (req, res, next) => {
    try {
        const { sort, type, status } = req.query;
        // sort defaults to "newest" — treat missing or empty string as "newest"
        const sortValue = sort && sort.trim() !== "" ? sort : "newest";
        if (sortValue !== "newest" && sortValue !== "oldest") {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid sort parameter",
                errors: "Sort must be newest or oldest",
            });
        }
        // Validate optional type filter
        if (type && !(0, validators_1.isValidIssueType)(type)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid type filter",
                errors: "Type must be bug or feature_request",
            });
        }
        // Validate optional status filter
        if (status && !(0, validators_1.isValidIssueStatus)(status)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid status filter",
                errors: "Status must be open, in_progress, or resolved",
            });
        }
        // Build dynamic WHERE clause
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
        // Fetch reporter details separately (no JOINs as per spec)
        const reporterMap = await buildReporterMap(issuesResult.rows.map((row) => row.reporter_id));
        // Map reporter object into each issue (replacing reporter_id)
        const data = issuesResult.rows.map((issue) => ({
            id: issue.id,
            title: issue.title,
            description: issue.description,
            type: issue.type,
            status: issue.status,
            reporter: reporterMap.get(issue.reporter_id) ?? null,
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
// GET /api/issues/:id — Retrieve a single issue with reporter details (public)
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
        // Fetch reporter details in a separate query (no JOINs per spec)
        const reporterResult = await db_1.pool.query("SELECT id, name, role FROM users WHERE id = $1", [issue.reporter_id]);
        const reporter = reporterResult.rows[0] ?? null;
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
// PATCH /api/issues/:id — Update an issue (maintainer: any issue; contributor: own open issue)
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
        // Fetch the existing issue to check ownership and status
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
        // Permission checks for contributors
        if (!isMaintainer) {
            // Contributor can only edit their own issue
            if (req.user?.id !== issue.reporter_id) {
                return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                    success: false,
                    message: "Forbidden",
                    errors: "You can only update your own issues",
                });
            }
            // Contributor can only edit issues that are still open (409 Conflict per spec)
            if (issue.status !== "open") {
                return res.status(http_status_codes_1.StatusCodes.CONFLICT).json({
                    success: false,
                    message: "Issue cannot be updated",
                    errors: "Contributors can only update issues with status: open",
                });
            }
        }
        // Spec says: contributors can update title, description, type only
        // Maintainers can update title, description, type, AND status independently
        const { title, description, type, status } = req.body;
        const updates = [];
        const values = [];
        // Validate and queue title update
        if (title !== undefined) {
            if (!title.trim()) {
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
        // Validate and queue description update
        if (description !== undefined) {
            if (!description.trim()) {
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
        // Validate and queue type update
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
        // Status update is exclusively for maintainers
        if (status !== undefined) {
            if (!isMaintainer) {
                return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                    success: false,
                    message: "Forbidden",
                    errors: "Only maintainers can change issue status",
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
        // Require at least one field to update
        if (updates.length === 0) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "No fields to update",
                errors: "Provide at least one of: title, description, type, status",
            });
        }
        // Always refresh updated_at on any change
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
// DELETE /api/issues/:id — Permanently remove an issue (maintainer only)
exports.issuesRouter.delete("/:id", auth_1.requireAuth, async (req, res, next) => {
    try {
        // Only maintainers can delete issues
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
        // 200 OK with success message (per spec — not 204)
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Issue deleted successfully",
        });
    }
    catch (error) {
        return next(error);
    }
});
