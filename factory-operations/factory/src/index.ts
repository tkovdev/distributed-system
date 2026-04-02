import { Kafka } from 'kafkajs';

const FACTORY_ID = process.env.FACTORY_ID;
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:29092';

if (!FACTORY_ID) {
  console.error('FACTORY_ID env var is required');
  process.exit(1);
}

const topic = `factory.${FACTORY_ID}.operations`;

const kafka = new Kafka({ clientId: `factory-${FACTORY_ID}`, brokers: [KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: `factory-process-${FACTORY_ID}` });
const producer = kafka.producer();

async function publish(type: string, payload?: Record<string, unknown>): Promise<void> {
  await producer.send({
    topic,
    messages: [{ key: FACTORY_ID, value: JSON.stringify({ type, factoryId: FACTORY_ID, payload, timestamp: new Date().toISOString() }) }],
  });
}

async function start(): Promise<void> {
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const event = JSON.parse(message.value.toString());
      console.log(`[factory:${FACTORY_ID}] received: ${event.type}`);

      if (event.type === 'FACTORY_START') {
        console.log(`Factory ${FACTORY_ID} is now running`);
        await publish('FACTORY_READY');
      }

      if (event.type === 'FACTORY_STOP') {
        console.log(`Factory ${FACTORY_ID} shutting down`);
        await publish('FACTORY_STOPPED');
        process.exit(0);
      }
    },
  });

  console.log(`Factory process ${FACTORY_ID} started`);
}

start().catch(err => {
  console.error('Factory process failed to start', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await consumer.disconnect();
  await producer.disconnect();
  process.exit(0);
});
