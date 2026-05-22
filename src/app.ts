import express from "express";
import { authRouter } from "./modules/auth";
import { issuesRouter } from "./modules/issues";
import { metricsRouter } from "./modules/metrics";
import { errorHandler } from "./middleware/errorHandler";
import { StatusCodes } from "http-status-codes";

export const app = express();

// Parse incoming JSON bodies
app.use(express.json());

// Route modules
app.use("/api/auth", authRouter);
app.use("/api/issues", issuesRouter);
app.use("/api/metrics", metricsRouter);

// 404 handler — catch all unmatched routes
app.use((_req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: "Route not found",
    errors: "Invalid endpoint",
  });
});

// Global error handler — must be last middleware
app.use(errorHandler);
