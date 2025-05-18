import express, { Request, Response } from 'express';
import { connectToDatabase } from './db/connection';
import ServerModel, { IServer } from './models/server';

const app = express();
const PORT = process.env.PORT || 3300;

// Connect to MongoDB
connectToDatabase().catch(err => {
  console.error('Failed to connect to MongoDB', err);
  process.exit(1);
});

// Middleware for parsing JSON
app.use(express.json());

// Simple health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'data-service' });
});

// Get all servers endpoint
app.get('/servers', async (req: Request, res: Response) => {
  try {
    const servers = await ServerModel.find();
    res.status(200).json({
      servers: servers
    });
  } catch (error) {
    console.error('Error fetching servers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch servers from database',
      message: 'An internal server error occurred'
    });
  }
});

// Seed initial data (for testing purposes)
app.post('/seed', async (req: Request, res: Response) => {
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
});

// Start the server
app.listen(PORT, () => {
  console.log(`Data service running on port ${PORT}`);
});

export default app;
