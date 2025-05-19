import express, { Request, Response } from 'express';
import ServerModel from '../models/server';

const router = express.Router();

// Function to seed initial data
const seedData = async (req: Request, res: Response): Promise<void> => {
  try {
    // Clear existing data
    await ServerModel.deleteMany({});

    // Create sample servers
    const servers = [
      { id: 1, name: 'Server 1', date: new Date(), status: 'active', ipAddress: '192.168.1.1', location: 'US-East' },
      { id: 2, name: 'Server 2', date: new Date(), status: 'maintenance', ipAddress: '192.168.1.2', location: 'US-West' },
      { id: 3, name: 'Server 3', date: new Date(), status: 'active', ipAddress: '192.168.1.3', location: 'EU-Central' }
    ];

    await ServerModel.insertMany(servers);

    res.status(201).json({
      message: 'Database seeded successfully',
      count: servers.length
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
router.post('/', seedData);

export default router;