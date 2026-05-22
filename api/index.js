"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../src/app");
// Vercel serverless function entry point — wraps the Express app
exports.default = app_1.app;
