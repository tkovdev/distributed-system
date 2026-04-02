import { Consumer } from 'kafkajs';
import { kafka } from './client';
import { OperationsEvent } from './operationsPublisher';

// One consumer instance per active factory
const consumers = new Map<string, Consumer>();

function handleEvent(event: OperationsEvent): void {
  console.log(`[ops:${event.factoryId}] ${event.type}`, event.payload ?? '');
}

async function ensureOperationsTopic(factoryId: string): Promise<void> {
  const topic = `factory.${factoryId}.operations`;
  const admin = kafka.admin();
  await admin.connect();
  try {
    const existing = await admin.listTopics();
    if (!existing.includes(topic)) {
      await admin.createTopics({
        topics: [{ topic, numPartitions: 1, replicationFactor: 1 }],
        waitForLeaders: true,
      });
      console.log(`Created operations topic: ${topic}`);
    }
  } finally {
    await admin.disconnect();
  }
}

export const subscribeToFactory = async (factoryId: string): Promise<void> => {
  if (consumers.has(factoryId)) return;

  await ensureOperationsTopic(factoryId);

  const topic = `factory.${factoryId}.operations`;
  const consumer = kafka.consumer({
    groupId: `orchestrator-ops-${factoryId}`,
  });

  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const event: OperationsEvent = JSON.parse(message.value.toString());
        handleEvent(event);
      } catch (err) {
        console.error(`Failed to parse operations message for factory ${factoryId}`, err);
      }
    },
  });

  consumers.set(factoryId, consumer);
  console.log(`Subscribed to operations topic for factory ${factoryId}`);
};

export const unsubscribeFromFactory = async (factoryId: string): Promise<void> => {
  const consumer = consumers.get(factoryId);
  if (!consumer) return;
  await consumer.disconnect();
  consumers.delete(factoryId);
};

export const disconnectAllOperationsConsumers = async (): Promise<void> => {
  for (const [factoryId, consumer] of consumers) {
    await consumer.disconnect();
    consumers.delete(factoryId);
  }
};
