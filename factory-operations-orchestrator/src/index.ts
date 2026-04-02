import { connectProducer, disconnectProducer } from './kafka/producer';
import { startCommandConsumer, disconnectConsumer } from './kafka/consumer';

async function start(): Promise<void> {
  await connectProducer().catch(err => {
    console.error('Failed to connect Kafka producer', err);
    process.exit(1);
  });

  await startCommandConsumer().catch(err => {
    console.error('Failed to start Kafka command consumer', err);
    process.exit(1);
  });

  console.log('Factory operations orchestrator running');
}

start();

process.on('SIGTERM', async () => {
  await disconnectProducer();
  await disconnectConsumer();
  process.exit(0);
});
