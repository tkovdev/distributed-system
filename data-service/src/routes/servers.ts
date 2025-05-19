import express, { Request, Response } from 'express';
import ServerModel from '../models/server';

const router = express.Router();

// Function to get all servers
const getServers = async (req: Request, res: Response): Promise<void> => {
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
};

// Register routes
router.get('/', getServers);

export default router;