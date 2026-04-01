import express, { Request, Response } from 'express';
import { FactoryModel, IFactory } from '../models/factory';
import { ConveyorModel, IConveyor } from '../models/conveyor';

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

const seedData = async (req: Request, res: Response): Promise<void> => {
  try {
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

// Register routes
router.get('/', getFactories);
router.get('/:id/conveyors', getFactoryConveyors);
router.post('/seed', seedData);

export default router;