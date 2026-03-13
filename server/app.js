import cors from 'cors';
import express from 'express';
import errorMiddleware from './middlewares/errorMiddleware.js';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

app.use(errorMiddleware);

export default app;
