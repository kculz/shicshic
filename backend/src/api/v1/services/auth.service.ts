import jwt from 'jsonwebtoken';
import User from '../../../database/models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret';

export const generateToken = (user: User) => {
    return jwt.sign(
        { id: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

export const verifyToken = (token: string) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};
