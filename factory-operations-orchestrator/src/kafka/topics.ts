import { kafka } from './client';

const TOPICS = [
  'factory.command',
  'factory.state',
];

export const initializeTopics = async (): Promise<void> => {
  const admin = kafka.admin();
  await admin.connect();

  try {
    const existing = await admin.listTopics();
    const toCreate = TOPICS
      .filter(t => !existing.includes(t))
      .map(topic => ({ topic, numPartitions: 1, replicationFactor: 1 }));

    if (toCreate.length > 0) {
      await admin.createTopics({ topics: toCreate, waitForLeaders: true });
      console.log('Created Kafka topics:', toCreate.map(t => t.topic).join(', '));
    }
  } finally {
    await admin.disconnect();
  }
};
