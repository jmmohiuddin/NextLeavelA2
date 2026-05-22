import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

export const metricsRouter = Router();

// GET /api/metrics — Internal system metrics (maintainer only)
metricsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    // Only maintainers can access internal metrics
    if (req.user?.role !== "maintainer") {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Forbidden",
        errors: "Only maintainers can access metrics",
      });
    }

    // Run individual COUNT queries (no JOINs per spec)
    const usersResult = await pool.query(
      "SELECT COUNT(*) AS count FROM users"
    );
    const issuesResult = await pool.query(
      "SELECT COUNT(*) AS count FROM issues"
    );
    const openResult = await pool.query(
      "SELECT COUNT(*) AS count FROM issues WHERE status = $1",
      ["open"]
    );
    const inProgressResult = await pool.query(
      "SELECT COUNT(*) AS count FROM issues WHERE status = $1",
      ["in_progress"]
    );
    const resolvedResult = await pool.query(
      "SELECT COUNT(*) AS count FROM issues WHERE status = $1",
      ["resolved"]
    );

    return res.status(StatusCodes.OK).json({
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
  } catch (error) {
    return next(error);
  }
});
