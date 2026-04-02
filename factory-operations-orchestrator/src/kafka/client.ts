import { Kafka } from 'kafkajs';

const broker = process.env.KAFKA_BROKER || 'localhost:9092';

export const kafka = new Kafka({
  clientId: 'factory-operations-orchestrator',
  brokers: [broker],
});
