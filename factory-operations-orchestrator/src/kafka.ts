import { Kafka, Producer, Consumer } from 'kafkajs';
import { FactoryStateSnapshot } from './state';

const broker = process.env.KAFKA_BROKER || 'localhost:9092';

const kafka = new Kafka({
  clientId: 'factory-operations-orchestrator',
  brokers: [broker],
});

export const COMMAND_TOPIC = 'factory.command';
export const STATE_TOPIC = 'factory.state';

const operationsTopicFor = (factoryId: string): string =>
  `factory.${factoryId}.operations`;

// Single producer for both state and per-factory operations topics
let producer: Producer;
let commandConsumer: Consumer;
const operationsConsumers = new Map<string, Consumer>();

// ---- Types ----

export interface FactoryCommand {
  commandId: string;
  type: string;
  factoryId: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

export interface OperationsEvent {
  type: string;
  factoryId: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

// ---- Topic setup ----

async function initializeTopics(): Promise<void> {
  const admin = kafka.admin();
  await admin.connect();
  try {
    const existing = await admin.listTopics();
    const toCreate = [COMMAND_TOPIC, STATE_TOPIC]
      .filter(t => !existing.includes(t))
      .map(topic => ({ topic, numPartitions: 1, replicationFactor: 1 }));
    if (toCreate.length > 0) {
      await admin.createTopics({ topics: toCreate, waitForLeaders: true });
      console.log('Created Kafka topics:', toCreate.map(t => t.topic).join(', '));
    }
  } finally {
    await admin.disconnect();
  }
}

async function ensureOperationsTopic(factoryId: string): Promise<void> {
  const topic = operationsTopicFor(factoryId);
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

// ---- Publish ----

export const publishState = async (snapshot: FactoryStateSnapshot): Promise<void> => {
  await producer.send({
    topic: STATE_TOPIC,
    messages: [{ key: snapshot.factoryId, value: JSON.stringify(snapshot) }],
  });
};

export const publishOperation = async (
  factoryId: string,
  type: string,
  payload?: Record<string, unknown>
): Promise<void> => {
  const event: OperationsEvent = {
    type,
    factoryId,
    payload,
    timestamp: new Date().toISOString(),
  };
  await producer.send({
    topic: operationsTopicFor(factoryId),
    messages: [{ key: factoryId, value: JSON.stringify(event) }],
  });
};

// ---- Per-factory operations subscription ----

export const subscribeToFactory = async (factoryId: string): Promise<void> => {
  if (operationsConsumers.has(factoryId)) return;
  await ensureOperationsTopic(factoryId);

  const consumer = kafka.consumer({ groupId: `orchestrator-ops-${factoryId}` });
  await consumer.connect();
  await consumer.subscribe({ topic: operationsTopicFor(factoryId), fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const event: OperationsEvent = JSON.parse(message.value.toString());
        console.log(`[ops:${event.factoryId}] ${event.type}`, event.payload ?? '');
      } catch (err) {
        console.error(`Failed to parse operations message for factory ${factoryId}`, err);
      }
    },
  });

  operationsConsumers.set(factoryId, consumer);
  console.log(`Subscribed to operations topic for factory ${factoryId}`);
};

export const unsubscribeFromFactory = async (factoryId: string): Promise<void> => {
  const consumer = operationsConsumers.get(factoryId);
  if (!consumer) return;
  await consumer.disconnect();
  operationsConsumers.delete(factoryId);
};

// ---- Lifecycle ----

export const connect = async (
  dispatch: (command: FactoryCommand) => Promise<void>
): Promise<void> => {
  await initializeTopics();

  producer = kafka.producer();
  await producer.connect();
  console.log('Kafka producer connected');

  commandConsumer = kafka.consumer({ groupId: 'factory-operations-orchestrator' });
  await commandConsumer.connect();
  await commandConsumer.subscribe({ topic: COMMAND_TOPIC, fromBeginning: false });
  await commandConsumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const command: FactoryCommand = JSON.parse(message.value.toString());
        await dispatch(command);
      } catch (err) {
        console.error('Failed to process factory.command message', err);
      }
    },
  });

  console.log('Kafka command consumer started');
};

export const disconnect = async (): Promise<void> => {
  await commandConsumer?.disconnect();
  await producer?.disconnect();
  for (const [, consumer] of operationsConsumers) {
    await consumer.disconnect();
  }
  operationsConsumers.clear();
};
