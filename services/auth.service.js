import 'dotenv/config.js';

import jwt from 'jsonwebtoken';

import { HttpError } from '../middlewares/error.middleware.js';

class AuthService {
    login(credentials) {
        const username = credentials?.username;
        const password = credentials?.password;

        if (!username || !password) {
            throw new HttpError('Username and password are required', 400);
        }

        if (!process.env.AUTH_USERNAME || !process.env.AUTH_PASSWORD || !process.env.JWT_SECRET) {
            throw new HttpError('Authentication service is not configured', 500);
        }

        if (username !== process.env.AUTH_USERNAME || password !== process.env.AUTH_PASSWORD) {
            throw new HttpError('Invalid credentials', 401);
        }

        const token = jwt.sign(
            {
                username
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || '1h'
            }
        );

        return `Bearer ${token}`;
    }

    verify_token(token) {
        if (!process.env.JWT_SECRET) {
            throw new HttpError('Authentication service is not configured', 500);
        }

        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            throw new HttpError('Invalid or expired token', 403);
        }
    }
}

export { AuthService };
