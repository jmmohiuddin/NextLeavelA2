"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendSuccess = void 0;
const http_status_codes_1 = require("http-status-codes");
/**
 * Send a standardized success response.
 * Shape: { success: true, message?, data? }
 */
const sendSuccess = (res, data, message, statusCode = http_status_codes_1.StatusCodes.OK) => {
    const body = { success: true };
    if (message !== undefined)
        body.message = message;
    if (data !== undefined)
        body.data = data;
    return res.status(statusCode).json(body);
};
exports.sendSuccess = sendSuccess;
/**
 * Send a standardized error response.
 * Shape: { success: false, message, errors }
 */
const sendError = (res, message, errors, statusCode = http_status_codes_1.StatusCodes.BAD_REQUEST) => {
    return res.status(statusCode).json({
        success: false,
        message,
        errors,
    });
};
exports.sendError = sendError;
