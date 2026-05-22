import { app } from "./app";
import { config } from "./config";

// Guard: JWT secret must be set in environment
if (!config.jwtSecret) {
  throw new Error("JWT_SECRET environment variable is required");
}

app.listen(config.port, () => {
  console.log(`DevPulse API running on port ${config.port}`);
});
