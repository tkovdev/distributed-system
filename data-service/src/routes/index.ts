import express from 'express';
import serversRouter from './servers';
import seedRouter from './seed';

const router = express.Router();

// Mount the servers router
router.use('/servers', serversRouter);

// Mount the seed router
router.use('/seed', seedRouter);

// Add more routers here as needed
// Example: router.use('/metrics', metricsRouter);

export default router;