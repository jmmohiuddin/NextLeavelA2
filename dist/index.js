"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const config_1 = require("./config");
// Guard: JWT secret must be set in environment
if (!config_1.config.jwtSecret) {
    throw new Error("JWT_SECRET environment variable is required");
}
app_1.app.listen(config_1.config.port, () => {
    console.log(`DevPulse API running on port ${config_1.config.port}`);
});
