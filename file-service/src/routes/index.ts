import express from 'express';
import filesRouter from './files';

const router = express.Router();

// Mount the files router
router.use('/files', filesRouter);

// Add more routers here as needed
// Example: router.use('/uploads', uploadsRouter);

export default router;