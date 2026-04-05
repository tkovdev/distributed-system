import { connect, disconnect } from './kafka';
import { getAllFactories } from './state';
import { stopFactoryContainers } from './docker';
import { dispatchCommand } from './handlers';

async function start(): Promise<void> {
  await connect(dispatchCommand).catch(err => {
    console.error('Failed to connect to Kafka', err);
    process.exit(1);
  });

  console.log('Factory operations orchestrator running');
}

start();

process.on('SIGTERM', async () => {
  // Stop all ephemeral containers first
  for (const factory of getAllFactories()) {
    await stopFactoryContainers(factory).catch(err =>
      console.warn(`Failed to stop containers for ${factory.factoryId}:`, err.message)
    );
  }
  await disconnect();
  process.exit(0);
});
