import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { pool } from "../db";
import { config } from "../config";
import { isValidEmail, isValidRole } from "../utils/validators";

export const authRouter = Router();

// POST /api/auth/signup — Register a new user
authRouter.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
    };

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Missing required fields",
        errors: "Name, email, and password are required",
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid email",
        errors: "Email format is invalid",
      });
    }

    // Validate role (defaults to contributor)
    const normalizedRole = role ?? "contributor";
    if (!isValidRole(normalizedRole)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid role",
        errors: "Role must be contributor or maintainer",
      });
    }

    // Check for duplicate email (400 Bad Request per spec)
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Email already registered",
        errors: "An account with this email already exists",
      });
    }

    // Hash password — never expose plain text
    const hashedPassword = await bcrypt.hash(password, config.bcryptSaltRounds);

    // Insert user and return safe fields (no password)
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at, updated_at`,
      [name, email, hashedPassword, normalizedRole]
    );

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "User registered successfully",
      data: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
});

// POST /api/auth/login — Authenticate and receive JWT
authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    // Validate required fields
    if (!email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Missing credentials",
        errors: "Email and password are required",
      });
    }

    // Fetch user by email
    const result = await pool.query(
      `SELECT id, name, email, password, role, created_at, updated_at
       FROM users WHERE email = $1`,
      [email]
    );

    if (!result.rowCount) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Invalid credentials",
        errors: "Email or password is incorrect",
      });
    }

    const user = result.rows[0] as {
      id: number;
      name: string;
      email: string;
      password: string;
      role: string;
      created_at: string;
      updated_at: string;
    };

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Invalid credentials",
        errors: "Email or password is incorrect",
      });
    }

    // Sign JWT — include id, name, role in payload (as per spec hint)
    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // Strip password from response — never expose in responses
    const { password: _password, ...safeUser } = user;

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: safeUser,
      },
    });
  } catch (error) {
    return next(error);
  }
});
