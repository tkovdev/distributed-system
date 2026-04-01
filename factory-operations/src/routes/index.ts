import express from 'express';
import factoriesRoute from './factories';

const router = express.Router();

// Mount the factories router
router.use('/factories', factoriesRoute);

export default router;