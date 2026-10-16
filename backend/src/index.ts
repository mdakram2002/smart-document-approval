import express from 'express';
import cors from 'cors';

import { env } from './utils/env.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import documentRoutes from './routes/documents.js';
import workflowRoutes from './routes/workflows.js';
import approvalRoutes from './routes/approvals.js';
import notificationRoutes from './routes/notifications.js';
import auditRoutes from './routes/audit.js';
import dashboardRoutes from './routes/dashboard.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const allowedOrigins = new Set(env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean));

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const isLocalDevelopmentOrigin = env.NODE_ENV === 'development'
      && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin ?? '');
    callback(null, !origin || allowedOrigins.has(origin) || isLocalDevelopmentOrigin);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${env.NODE_ENV} mode`);
});

export default app;
