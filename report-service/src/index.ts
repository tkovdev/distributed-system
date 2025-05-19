import express, { Request, Response } from 'express';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3200;

// Middleware for parsing JSON
app.use(express.json());

// Simple health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'report-service' });
});

// Mount all routes
app.use(routes);

// Start the server
app.listen(PORT, () => {
  console.log(`Report service running on port ${PORT}`);
});

export default app;
