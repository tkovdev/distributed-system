import express from 'express';
import reportsRouter from './reports';

const router = express.Router();

// Mount the reports router
router.use('/reports', reportsRouter);

// Add more routers here as needed
// Example: router.use('/analytics', analyticsRouter);

export default router;