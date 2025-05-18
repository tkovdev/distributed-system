import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3100;

// Middleware for parsing JSON
app.use(express.json());

// Simple health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'report-service' });
});

// Example report endpoint
app.get('/files', (req: Request, res: Response) => {
  res.status(200).json({
    files: [
      { id: 1, name: 'File name 1', date: new Date().toISOString() },
      { id: 2, name: 'File name 2', date: new Date().toISOString() }
    ]
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`File service running on port ${PORT}`);
});

export default app;