import { Producer } from 'kafkajs';
import { kafka } from './client';

export interface OperationsEvent {
  type: string;
  factoryId: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

let producer: Producer;

export const connectOperationsProducer = async (): Promise<void> => {
  // Reuse the same producer instance created in producer.ts if already connected —
  // but for isolation we create a dedicated one here.
  producer = kafka.producer();
  await producer.connect();
};

export const disconnectOperationsProducer = async (): Promise<void> => {
  if (producer) await producer.disconnect();
};

export const operationsTopic = (factoryId: string): string =>
  `factory.${factoryId}.operations`;

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
    topic: operationsTopic(factoryId),
    messages: [{ key: factoryId, value: JSON.stringify(event) }],
  });
};
