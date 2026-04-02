import express from 'express';
import factoriesRoute from './factories';
import workersRoute from './workers';

const router = express.Router();

// Mount the factories router
router.use('/factories', factoriesRoute);
router.use('/workers', workersRoute);

export default router;