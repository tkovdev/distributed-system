import express, { Request, Response } from 'express';
import { WorkerModel } from '../models/worker';
import { publishCommand } from '../kafka/producer';
import { CommandType } from '../kafka/commandTypes';

const router = express.Router();

// Function to get all workers
const getWorkers = async (req: Request, res: Response): Promise<void> => {
  try {
    const workers = await WorkerModel.find();
    res.status(200).json({
      workers
    });
  } catch (error) {
    console.error('Error fetching workers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch workers from database',
      message: 'An internal server error occurred'
    });
  }
};

const seedData = async (req: Request, res: Response): Promise<void> => {
  try {
    // Clear existing data
    await WorkerModel.deleteMany({});

    // Create sample workers
    const workers = [
      { name: 'Worker 1', location: 'US-East', type: 'human', shift: 'day' },
      { name: 'Worker 2', location: 'US-West', type: 'human', shift: 'night' },
      { name: 'Worker 3', location: 'EU-Central', type: 'robot', firmwareVersion: '1.0.0' }
    ];

    await WorkerModel.insertMany(workers);

    res.status(201).json({
      message: 'Database seeded successfully',
      count: workers.length
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({ 
      error: 'Failed to seed database',
      message: 'An internal server error occurred'
    });
  }
};

// Register routes
router.get('/', getWorkers);
router.post('/seed', seedData);

// POST /workers/:workerId/assign/:factoryId
router.post('/:workerId/assign/:factoryId', async (req: Request, res: Response): Promise<void> => {
  const { workerId, factoryId } = req.params;
  const worker = await WorkerModel.findById(workerId);
  if (!worker) {
    res.status(404).json({ error: 'Worker not found', workerId });
    return;
  }
  const command = await publishCommand(CommandType.ASSIGN_WORKER, factoryId, {
    workerId,
    name: worker.name,
    type: worker.type,
  });
  res.status(202).json({ commandId: command.commandId, type: command.type });
});

// POST /workers/:workerId/unassign/:factoryId
router.post('/:workerId/unassign/:factoryId', async (req: Request, res: Response): Promise<void> => {
  const { workerId, factoryId } = req.params;
  const command = await publishCommand(CommandType.UNASSIGN_WORKER, factoryId, { workerId });
  res.status(202).json({ commandId: command.commandId, type: command.type });
});

export default router;