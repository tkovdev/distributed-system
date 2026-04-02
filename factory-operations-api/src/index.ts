import express, { Request, Response } from 'express';
import routes from './routes';
import { connectToDatabase } from './db/connection';
import { connectProducer, disconnectProducer } from './kafka/producer';
import { startStateConsumer, disconnectConsumer } from './kafka/consumer';
import { syncFactoriesToOrchestrator } from './kafka/sync';

const app = express();
const PORT = process.env.PORT || 3300;

app.use(express.json());

// Simple health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'factory-operations-api' });
});

// Mount all routes
app.use(routes);

async function start(): Promise<void> {
  await connectToDatabase().catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

  await connectProducer().catch(err => {
    console.error('Failed to connect Kafka producer', err);
    process.exit(1);
  });

  await startStateConsumer().catch(err => {
    console.error('Failed to start Kafka state consumer', err);
    process.exit(1);
  });

  await syncFactoriesToOrchestrator().catch(err => {
    // Non-fatal: orchestrator may not have data yet if DB is empty
    console.warn('Factory sync skipped (no factories in DB or Kafka unavailable):', err);
  });

  app.listen(PORT, () => {
    console.log(`Factory operations API running on port ${PORT}`);
  });
}

start();

process.on('SIGTERM', async () => {
  await disconnectProducer();
  await disconnectConsumer();
  process.exit(0);
});

export default app;
