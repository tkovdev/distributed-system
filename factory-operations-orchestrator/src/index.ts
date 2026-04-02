import { connectProducer, disconnectProducer } from './kafka/producer';
import { startCommandConsumer, disconnectConsumer } from './kafka/consumer';
import { connectOperationsProducer, disconnectOperationsProducer } from './kafka/operationsPublisher';
import { disconnectAllOperationsConsumers } from './kafka/operationsConsumer';
import { initializeTopics } from './kafka/topics';

async function start(): Promise<void> {
  await initializeTopics().catch(err => {
    console.error('Failed to initialize Kafka topics', err);
    process.exit(1);
  });

  await connectProducer().catch(err => {
    console.error('Failed to connect Kafka producer', err);
    process.exit(1);
  });

  await connectOperationsProducer().catch(err => {
    console.error('Failed to connect Kafka operations producer', err);
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
  await disconnectOperationsProducer();
  await disconnectConsumer();
  await disconnectAllOperationsConsumers();
  process.exit(0);
});
