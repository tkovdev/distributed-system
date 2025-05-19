import express, { Request, Response } from 'express';
import { connectToDatabase } from './db/connection';
import routes from './routes';

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

// Mount all routes
app.use(routes);

// Start the server
app.listen(PORT, () => {
  console.log(`Data service running on port ${PORT}`);
});

export default app;
