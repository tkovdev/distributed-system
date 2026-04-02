import { Producer } from 'kafkajs';
import { randomUUID } from 'crypto';
import { kafka } from './client';

export const COMMAND_TOPIC = 'factory.command';

export interface FactoryCommand {
  commandId: string;
  type: string;
  factoryId: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

let producer: Producer;

export const connectProducer = async (): Promise<void> => {
  producer = kafka.producer();
  await producer.connect();
  console.log('Kafka producer connected');
};

export const disconnectProducer = async (): Promise<void> => {
  if (producer) {
    await producer.disconnect();
  }
};

export const publishCommand = async (
  type: string,
  factoryId: string,
  payload?: Record<string, unknown>
): Promise<FactoryCommand> => {
  const command: FactoryCommand = {
    commandId: randomUUID(),
    type,
    factoryId,
    payload,
    timestamp: new Date().toISOString(),
  };

  await producer.send({
    topic: COMMAND_TOPIC,
    messages: [{ key: factoryId, value: JSON.stringify(command) }],
  });

  return command;
};
