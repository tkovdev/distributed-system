import { Consumer } from 'kafkajs';
import { kafka } from './client';
import { FactoryCommand, dispatchCommand } from '../handlers';

export const COMMAND_TOPIC = 'factory.command';

let consumer: Consumer;

export const startCommandConsumer = async (): Promise<void> => {
  consumer = kafka.consumer({ groupId: 'factory-operations-orchestrator' });
  await consumer.connect();
  await consumer.subscribe({ topic: COMMAND_TOPIC, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const command: FactoryCommand = JSON.parse(message.value.toString());
        await dispatchCommand(command);
      } catch (err) {
        console.error('Failed to process factory.command message', err);
      }
    },
  });

  console.log('Kafka command consumer started');
};

export const disconnectConsumer = async (): Promise<void> => {
  if (consumer) {
    await consumer.disconnect();
  }
};
