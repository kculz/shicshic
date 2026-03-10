import express from 'express';
import type { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import userRoutes from './api/v1/routes/user.route.js';
import profileRoutes from './api/v1/routes/profile.route.js';
import tripRoutes from './api/v1/routes/trip.route.js';
import sequelize from './config/database.js';
// Models — imported to ensure Sequelize registers them for sync
import './database/models/Bid.js';
import './database/models/ChatMessage.js';
import './queues/otp.queue.js'; // initialize queues


dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'OK', message: 'ShicShic API is running' });
});

// Routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/profiles', profileRoutes);
app.use('/api/v1/trips', tripRoutes);

// Base route for v1
app.get('/api/v1', (req: Request, res: Response) => {
    res.json({ message: 'Welcome to ShicShic API v1' });
});

const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('[database]: Connection has been established successfully.');

        // Sync models
        await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
        console.log('[database]: Models synced successfully.');

        app.listen(port, () => {
            console.log(`[server]: Server is running at http://localhost:${port}`);
        });
    } catch (error) {
        console.error('[server]: Unable to connect to the database:', error);
        process.exit(1);
    }
};

startServer();
