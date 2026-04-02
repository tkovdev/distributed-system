import Dockerode from 'dockerode';
import { FactoryStateSnapshot } from '../state/factoryState';

const docker = new Dockerode({ socketPath: '/var/run/docker.sock' });

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:29092';
const DOCKER_NETWORK = process.env.DOCKER_NETWORK || 'distributed-system_app-network';

const FACTORY_IMAGE = process.env.FACTORY_IMAGE || 'factory-process';
const CONVEYOR_IMAGE = process.env.CONVEYOR_IMAGE || 'conveyor-process';
const WORKER_IMAGE = process.env.WORKER_IMAGE || 'worker-process';

const containerName = (prefix: string, ...ids: string[]): string =>
  [prefix, ...ids].join('-').replace(/[^a-zA-Z0-9_.-]/g, '-');

async function runContainer(name: string, image: string, env: string[]): Promise<void> {
  // Remove any existing container with the same name first
  try {
    const existing = docker.getContainer(name);
    await existing.remove({ force: true });
  } catch {
    // Container didn't exist — that's fine
  }

  const container = await docker.createContainer({
    name,
    Image: image,
    Env: env,
    HostConfig: {
      NetworkMode: DOCKER_NETWORK,
      AutoRemove: true,
    },
  });
  await container.start();
  console.log(`Started container: ${name}`);
}

async function stopContainer(name: string): Promise<void> {
  try {
    const container = docker.getContainer(name);
    await container.stop();
    console.log(`Stopped container: ${name}`);
  } catch (err: unknown) {
    // Container may have already stopped or never existed
    if (err instanceof Error && !err.message.includes('404')) {
      console.warn(`Could not stop container ${name}:`, err.message);
    }
  }
}

export async function startFactoryContainers(factory: FactoryStateSnapshot): Promise<void> {
  const { factoryId } = factory;

  await runContainer(
    containerName('factory', factoryId),
    FACTORY_IMAGE,
    [`KAFKA_BROKER=${KAFKA_BROKER}`, `FACTORY_ID=${factoryId}`]
  );

  for (const conveyor of factory.conveyors) {
    await runContainer(
      containerName('conveyor', factoryId, conveyor.conveyorId),
      CONVEYOR_IMAGE,
      [
        `KAFKA_BROKER=${KAFKA_BROKER}`,
        `FACTORY_ID=${factoryId}`,
        `CONVEYOR_ID=${conveyor.conveyorId}`,
      ]
    );
  }
}

export async function stopFactoryContainers(factory: FactoryStateSnapshot): Promise<void> {
  const { factoryId } = factory;

  await stopContainer(containerName('factory', factoryId));

  for (const conveyor of factory.conveyors) {
    await stopContainer(containerName('conveyor', factoryId, conveyor.conveyorId));
  }

  for (const worker of factory.workers) {
    await stopContainer(containerName('worker', factoryId, worker.workerId));
  }
}

export async function startWorkerContainer(
  factoryId: string,
  workerId: string,
  workerType: string
): Promise<void> {
  await runContainer(
    containerName('worker', factoryId, workerId),
    WORKER_IMAGE,
    [
      `KAFKA_BROKER=${KAFKA_BROKER}`,
      `FACTORY_ID=${factoryId}`,
      `WORKER_ID=${workerId}`,
      `WORKER_TYPE=${workerType}`,
    ]
  );
}

export async function stopWorkerContainer(factoryId: string, workerId: string): Promise<void> {
  await stopContainer(containerName('worker', factoryId, workerId));
}
