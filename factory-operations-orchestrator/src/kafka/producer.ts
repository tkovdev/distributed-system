import { Producer } from 'kafkajs';
import { kafka } from './client';
import { FactoryStateSnapshot } from '../state/factoryState';

export const STATE_TOPIC = 'factory.state';

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

export const publishState = async (snapshot: FactoryStateSnapshot): Promise<void> => {
  await producer.send({
    topic: STATE_TOPIC,
    messages: [{ key: snapshot.factoryId, value: JSON.stringify(snapshot) }],
  });
};
