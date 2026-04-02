import { Kafka } from 'kafkajs';

const FACTORY_ID = process.env.FACTORY_ID;
const WORKER_ID = process.env.WORKER_ID;
const WORKER_TYPE = process.env.WORKER_TYPE || 'human';
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:29092';

if (!FACTORY_ID || !WORKER_ID) {
  console.error('FACTORY_ID and WORKER_ID env vars are required');
  process.exit(1);
}

const topic = `factory.${FACTORY_ID}.operations`;

const kafka = new Kafka({ clientId: `worker-${WORKER_ID}`, brokers: [KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: `worker-process-${FACTORY_ID}-${WORKER_ID}` });
const producer = kafka.producer();

async function publish(type: string, payload?: Record<string, unknown>): Promise<void> {
  await producer.send({
    topic,
    messages: [{ key: WORKER_ID, value: JSON.stringify({ type, factoryId: FACTORY_ID, workerId: WORKER_ID, workerType: WORKER_TYPE, payload, timestamp: new Date().toISOString() }) }],
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

      // Only handle events targeting this worker
      if (event.workerId && event.workerId !== WORKER_ID) return;

      console.log(`[worker:${WORKER_ID}] received: ${event.type}`);

      if (event.type === 'WORKER_ASSIGN') {
        console.log(`Worker ${WORKER_ID} (${WORKER_TYPE}) is now active in factory ${FACTORY_ID}`);
        await publish('WORKER_ACTIVE');
      }

      if (event.type === 'WORKER_UNASSIGN') {
        console.log(`Worker ${WORKER_ID} leaving factory ${FACTORY_ID}`);
        await publish('WORKER_IDLE');
        process.exit(0);
      }

      if (event.type === 'FACTORY_STOP') {
        await publish('WORKER_IDLE');
        process.exit(0);
      }
    },
  });

  console.log(`Worker process ${WORKER_ID} (${WORKER_TYPE}) started (factory: ${FACTORY_ID})`);
}

start().catch(err => {
  console.error('Worker process failed to start', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await consumer.disconnect();
  await producer.disconnect();
  process.exit(0);
});
