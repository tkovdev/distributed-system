import express from 'express';
import factoriesRoute from './factories';
import workersRoute from './workers';
import warehouseRoute from './warehouse';

const router = express.Router();

// Mount the factories router
router.use('/factories', factoriesRoute);
router.use('/workers', workersRoute);
router.use('/warehouse', warehouseRoute);

export default router;