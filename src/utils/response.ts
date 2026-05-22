import { Response } from "express";
import { StatusCodes } from "http-status-codes";

/**
 * Send a standardized success response.
 * Shape: { success: true, message?, data? }
 */
export const sendSuccess = (
  res: Response,
  data: unknown,
  message?: string,
  statusCode: number = StatusCodes.OK
): Response => {
  const body: Record<string, unknown> = { success: true };
  if (message !== undefined) body.message = message;
  if (data !== undefined) body.data = data;
  return res.status(statusCode).json(body);
};

/**
 * Send a standardized error response.
 * Shape: { success: false, message, errors }
 */
export const sendError = (
  res: Response,
  message: string,
  errors: string,
  statusCode: number = StatusCodes.BAD_REQUEST
): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};
