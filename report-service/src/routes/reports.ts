import express, { Request, Response } from 'express';
import axios from 'axios';

const router = express.Router();
const FILE_SERVICE_URL = process.env.FILE_SERVICE_URL || 'http://localhost:3100';

// Function to get reports from file-service
const getReports = async (req: Request, res: Response): Promise<void> => {
  try {
    // Call the file-service to get files
    const response = await axios.get(`${FILE_SERVICE_URL}/files`);

    // Return the files data from the file-service
    res.status(200).json({
      reports: response.data.files
    });
  } catch (error) {
    console.error('Error fetching files from file-service:', error);
    res.status(500).json({ 
      error: 'Failed to fetch files from file-service',
      message: 'The file service might be down or unreachable'
    });
  }
};

// Register routes
router.get('/', getReports);

export default router;
