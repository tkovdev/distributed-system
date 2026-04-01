import express, { Request, Response } from 'express';
import { FactoryModel } from '../models/factory';

const router = express.Router();

// Function to get all factories
const getFactories = async (req: Request, res: Response): Promise<void> => {
  try {
    const factories = await FactoryModel.find();
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

const seedData = async (req: Request, res: Response): Promise<void> => {
  try {
    // Clear existing data
    await FactoryModel.deleteMany({});

    // Create sample factories
    const factories = [
      { id: 1, name: 'Factory 1', status: 'active', location: 'US-East' },
      { id: 2, name: 'Factory 2', status: 'maintenance', location: 'US-West' },
      { id: 3, name: 'Factory 3', status: 'active', location: 'EU-Central' }
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
router.post('/seed', seedData);

export default router;