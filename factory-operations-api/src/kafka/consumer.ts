import { Consumer } from 'kafkajs';
import { kafka } from './client';

export const STATE_TOPIC = 'factory.state';

let consumer: Consumer;

// In-memory cache of the latest state snapshot per factory
const factoryStateCache = new Map<string, unknown>();

export const getFactoryState = (factoryId: string): unknown =>
  factoryStateCache.get(factoryId);

export const getAllFactoryStates = (): Record<string, unknown> =>
  Object.fromEntries(factoryStateCache);

export const startStateConsumer = async (): Promise<void> => {
  consumer = kafka.consumer({ groupId: 'factory-operations-api' });
  await consumer.connect();
  await consumer.subscribe({ topic: STATE_TOPIC, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const state = JSON.parse(message.value.toString());
        if (state.factoryId) {
          factoryStateCache.set(state.factoryId, state);
        }
      } catch (err) {
        console.error('Failed to parse factory.state message', err);
      }
    },
  });

  console.log('Kafka state consumer started');
};

export const disconnectConsumer = async (): Promise<void> => {
  if (consumer) {
    await consumer.disconnect();
  }
};
