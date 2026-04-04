import express, { Request, Response } from 'express';
import { FactoryModel, IFactory } from '../models/factory';
import { ConveyorModel, IConveyor } from '../models/conveyor';
import { syncFactoriesToOrchestrator } from '../kafka/sync';
import { publishCommand } from '../kafka/producer';
import { getFactoryState, getAllFactoryStates } from '../kafka/consumer';
import { CommandType } from '../kafka/commandTypes';

const router = express.Router();

// Function to get all factories
const getFactories = async (req: Request, res: Response): Promise<void> => {
  try {
    const factories = await FactoryModel.aggregate([
        {
          $lookup: {
            from: "conveyors",
            localField: "conveyors",
            foreignField: "_id",
            as: "conveyorDocs"
          }
        },
        {
          $project: {
            name: 1,
            status: 1,
            location: 1,
            conveyorCount: { $size: "$conveyors" },
            effectiveCapacity: {
              $sum: {
                $map: {
                  input: { 
                    $filter: { 
                      input: "$conveyorDocs", 
                      as: "conveyor", 
                      cond: { $eq: ["$$conveyor.status", "active"] }
                    }
                  },
                  as: "conveyor",
                  in: "$$conveyor.capacity"
                }
              }
            },
            totalCapacity: {
              $sum: "$conveyorDocs.capacity"
            }
          }
        }
    ]);

    res.status(200).json({
      factories
    });
  } catch (error) {
    console.error('Error fetching factories:', error);
    res.status(500).json({ 
      error: 'Failed to fetch factories from database',
      message: 'An internal server error occurred'
    });
  }
};

const getFactoryConveyors = async (req: Request, res: Response): Promise<void> => {
  try {
    const factoryId = req.params.id; // Factory ID from URL
    const factory = await FactoryModel.findById(factoryId).populate('conveyors').select('conveyors').exec();
    
    if (!factory) {
      res.status(404).json({ 
        error: 'Factory not found',
        message: `No factory found with ID ${factoryId}`
      });
      return;
    }
    
    res.status(200).json({
      conveyors: factory.conveyors || []
    });

  } catch (error) {
    console.error('Error fetching factory conveyors:', error);
    res.status(500).json({ 
      error: 'Failed to fetch factory conveyors from database',
      message: 'An internal server error occurred'
    });
  }
};

// A destructive function that removes any existing factories, conveyors and workers (including their containers). Inserts new factory records and associated conveyors, then syncs to orchestrator so it has the latest state. 
// Useful for testing and local development to reset to a known state with predictable IDs.
const seedData = async (req: Request, res: Response): Promise<void> => {
  try {
    // Stop any running containers for existing factories before wiping the DB.
    // New seed data gets new MongoDB _ids, so REGISTER_FACTORY won't find the old
    // factories by their old IDs — we must explicitly stop them first.
    const existingFactories = await FactoryModel.find({}, '_id').lean();
    for (const factory of existingFactories) {
      await publishCommand('STOP_FACTORY', factory._id.toString());
    }

    // Clear existing data
    await FactoryModel.deleteMany({});
    await ConveyorModel.deleteMany({});

    const conveyors: IConveyor[] = [
      { name: 'Conveyor 1', status: 'active', capacity: 100 },
      { name: 'Conveyor 2', status: 'inactive', capacity: 150 },
      { name: 'Conveyor 3', status: 'maintenance', capacity: 200 },
      { name: 'Conveyor 4', status: 'active', capacity: 120 },
      { name: 'Conveyor 5', status: 'active', capacity: 180 },
      { name: 'Conveyor 6', status: 'maintenance', capacity: 160 },
      { name: 'Conveyor 7', status: 'active', capacity: 140 }
    ];
    
    const insertedConveyors = await ConveyorModel.insertMany(conveyors);

    // Create sample factories
    const factories: IFactory[] = [
      { name: 'Factory 1', status: 'active', location: 'US-East', conveyors: [insertedConveyors[0]._id, insertedConveyors[1]._id, insertedConveyors[6]._id] },
      { name: 'Factory 2', status: 'maintenance', location: 'US-West', conveyors: [insertedConveyors[2]._id, insertedConveyors[3]._id] },
      { name: 'Factory 3', status: 'active', location: 'EU-Central', conveyors: [insertedConveyors[4]._id, insertedConveyors[5]._id] }
    ];

    await FactoryModel.insertMany(factories);

    await syncFactoriesToOrchestrator();

    res.status(201).json({
      message: 'Database seeded successfully',
      count: factories.length
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({ 
      error: 'Failed to seed database',
      message: 'An internal server error occurred'
    });
  }
};

// POST /factories/sync — publishes REGISTER_FACTORY commands for all factories in MongoDB
const syncFactories = async (req: Request, res: Response): Promise<void> => {
  try {
    await syncFactoriesToOrchestrator();
    res.status(200).json({ message: 'Factories synced to orchestrator' });
  } catch (error) {
    console.error('Error syncing factories:', error);
    res.status(500).json({
      error: 'Failed to sync factories',
      message: 'An internal server error occurred'
    });
  }
};

// GET /factories/state — returns latest state snapshot for all factories from cache
const getFactoriesState = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ factories: getAllFactoryStates() });
};

// GET /factories/:id/state — returns latest state snapshot for a specific factory from cache
const getFactoryStateById = async (req: Request, res: Response): Promise<void> => {
  const state = getFactoryState(req.params.id);
  if (!state) {
    res.status(404).json({ error: 'No state found for factory', factoryId: req.params.id });
    return;
  }
  res.status(200).json(state);
};

// POST /factories/:id/start
const startFactory = async (req: Request, res: Response): Promise<void> => {
  const command = await publishCommand(CommandType.START_FACTORY, req.params.id);
  res.status(202).json({ commandId: command.commandId, type: command.type });
};

// POST /factories/:id/stop
const stopFactory = async (req: Request, res: Response): Promise<void> => {
  const command = await publishCommand(CommandType.STOP_FACTORY, req.params.id);
  res.status(202).json({ commandId: command.commandId, type: command.type });
};

// POST /factories/:id/reset
const resetFactory = async (req: Request, res: Response): Promise<void> => {
  const command = await publishCommand(CommandType.RESET_FACTORY, req.params.id);
  res.status(202).json({ commandId: command.commandId, type: command.type });
};

// POST /factories/:id/output/increase
const increaseOutput = async (req: Request, res: Response): Promise<void> => {
  const command = await publishCommand(CommandType.INCREASE_OUTPUT, req.params.id);
  res.status(202).json({ commandId: command.commandId, type: command.type });
};

// POST /factories/:id/output/decrease
const decreaseOutput = async (req: Request, res: Response): Promise<void> => {
  const command = await publishCommand(CommandType.DECREASE_OUTPUT, req.params.id);
  res.status(202).json({ commandId: command.commandId, type: command.type });
};

// Register routes
router.get('/state', getFactoriesState);
router.get('/', getFactories);
router.get('/:id/state', getFactoryStateById);
router.get('/:id/conveyors', getFactoryConveyors);
router.post('/seed', seedData);
router.post('/sync', syncFactories);
router.post('/:id/start', startFactory);
router.post('/:id/stop', stopFactory);
router.post('/:id/reset', resetFactory);
router.post('/:id/output/increase', increaseOutput);
router.post('/:id/output/decrease', decreaseOutput);

export default router;