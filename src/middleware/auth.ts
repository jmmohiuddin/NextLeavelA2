import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { config } from "../config";
import { AuthPayload, UserRole } from "../types";

/**
 * requireAuth middleware — verifies the JWT in the Authorization header.
 * Spec says: Authorization: <token> (with or without "Bearer " prefix)
 * Attaches decoded payload (id, name, role) to req.user.
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
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
    const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
    req.user = {
      id: payload.id,
      name: payload.name,
      role: payload.role,
    };
    return next();
  } catch {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: "Invalid or expired token",
      errors: "Authentication failed",
    });
  }
};

/**
 * requireRole middleware factory — checks that the authenticated user has the required role.
 * Use AFTER requireAuth.
 */
export const requireRole =
  (role: UserRole) =>
  (req: Request, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Missing authentication token",
        errors: "Authorization header is required",
      });
    }

    if (req.user.role !== role) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Forbidden",
        errors: "Insufficient permissions",
      });
    }

    return next();
  };
