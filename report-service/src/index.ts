import express, { Request, Response } from 'express';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3200;
const FILE_SERVICE_URL = process.env.FILE_SERVICE_URL || 'http://localhost:3100';

// Middleware for parsing JSON
app.use(express.json());

// Simple health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'report-service' });
});

// Reports endpoint that calls file-service
app.get('/reports', async (req: Request, res: Response) => {
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
});

// Start the server
app.listen(PORT, () => {
  console.log(`Report service running on port ${PORT}`);
});

export default app;
