import { Kafka } from 'kafkajs';

const FACTORY_ID = process.env.FACTORY_ID;
const CONVEYOR_ID = process.env.CONVEYOR_ID;
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:29092';

if (!FACTORY_ID || !CONVEYOR_ID) {
  console.error('FACTORY_ID and CONVEYOR_ID env vars are required');
  process.exit(1);
}

const topic = `factory.${FACTORY_ID}.operations`;

const kafka = new Kafka({ clientId: `conveyor-${CONVEYOR_ID}`, brokers: [KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: `conveyor-process-${FACTORY_ID}-${CONVEYOR_ID}` });
const producer = kafka.producer();

async function publish(type: string, payload?: Record<string, unknown>): Promise<void> {
  await producer.send({
    topic,
    messages: [{ key: CONVEYOR_ID, value: JSON.stringify({ type, factoryId: FACTORY_ID, conveyorId: CONVEYOR_ID, payload, timestamp: new Date().toISOString() }) }],
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

      // Only handle events targeting this conveyor or broadcast factory events
      if (event.conveyorId && event.conveyorId !== CONVEYOR_ID) return;

      console.log(`[conveyor:${CONVEYOR_ID}] received: ${event.type}`);

      if (event.type === 'FACTORY_START' || event.type === 'CONVEYOR_START') {
        console.log(`Conveyor ${CONVEYOR_ID} running`);
        await publish('CONVEYOR_ACTIVE');
      }

      if (event.type === 'FACTORY_STOP' || event.type === 'CONVEYOR_STOP') {
        console.log(`Conveyor ${CONVEYOR_ID} stopping`);
        await publish('CONVEYOR_IDLE');
        process.exit(0);
      }
    },
  });

  console.log(`Conveyor process ${CONVEYOR_ID} started (factory: ${FACTORY_ID})`);
}

start().catch(err => {
  console.error('Conveyor process failed to start', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await consumer.disconnect();
  await producer.disconnect();
  process.exit(0);
});
