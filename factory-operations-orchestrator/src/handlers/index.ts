import { getFactory, upsertFactory, FactoryStateSnapshot, ConveyorState, ConveyorStatus } from '../state/factoryState';
import { publishState } from '../kafka/producer';
import { publishOperation } from '../kafka/operationsPublisher';
import { subscribeToFactory, unsubscribeFromFactory } from '../kafka/operationsConsumer';
import {
  startFactoryContainers,
  stopFactoryContainers,
  startWorkerContainer,
  stopWorkerContainer,
} from '../docker/manager';

export type CommandType =
  | 'START_FACTORY'
  | 'STOP_FACTORY'
  | 'ASSIGN_WORKER'
  | 'UNASSIGN_WORKER'
  | 'RESET_FACTORY'
  | 'INCREASE_OUTPUT'
  | 'DECREASE_OUTPUT'
  | 'REGISTER_FACTORY';

export interface FactoryCommand {
  commandId: string;
  type: CommandType;
  factoryId: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

export const dispatchCommand = async (command: FactoryCommand): Promise<void> => {
  console.log(`[${command.type}] factoryId=${command.factoryId} commandId=${command.commandId}`);

  switch (command.type) {
    case 'REGISTER_FACTORY':
      return handleRegisterFactory(command);
    case 'START_FACTORY':
      return handleStart(command);
    case 'STOP_FACTORY':
      return handleStop(command);
    case 'RESET_FACTORY':
      return handleReset(command);
    case 'ASSIGN_WORKER':
      return handleAssignWorker(command);
    case 'UNASSIGN_WORKER':
      return handleUnassignWorker(command);
    case 'INCREASE_OUTPUT':
      return handleOutputChange(command, 1);
    case 'DECREASE_OUTPUT':
      return handleOutputChange(command, -1);
    default:
      console.warn(`Unknown command type: ${(command as FactoryCommand).type}`);
  }
};

async function handleRegisterFactory(command: FactoryCommand): Promise<void> {
  const { factoryId, payload } = command;

  const rawConveyors = (payload?.conveyors as Array<Record<string, unknown>> | undefined) ?? [];
  const conveyors: ConveyorState[] = rawConveyors.map(c => ({
    conveyorId: c.conveyorId as string,
    name: c.name as string,
    status: c.status as ConveyorStatus,
    capacity: c.capacity as number,
  }));

  const snapshot: FactoryStateSnapshot = {
    factoryId,
    name: (payload?.name as string) ?? factoryId,
    status: 'inactive',
    location: (payload?.location as string) ?? '',
    totalCapacity: (payload?.totalCapacity as number) ?? 0,
    conveyors,
    workers: [],
    outputLevel: 1,
    lastUpdated: new Date().toISOString(),
  };
  upsertFactory(snapshot);
  await publishState(snapshot);
}

async function handleStart(command: FactoryCommand): Promise<void> {
  const factory = getFactory(command.factoryId);
  if (!factory) {
    console.warn(`Factory not found: ${command.factoryId}`);
    return;
  }
  factory.status = 'active';
  upsertFactory(factory);
  await publishState(factory);
  await subscribeToFactory(factory.factoryId);
  await startFactoryContainers(factory);
  await publishOperation(factory.factoryId, 'FACTORY_START');
}

async function handleStop(command: FactoryCommand): Promise<void> {
  const factory = getFactory(command.factoryId);
  if (!factory) {
    console.warn(`Factory not found: ${command.factoryId}`);
    return;
  }
  await publishOperation(factory.factoryId, 'FACTORY_STOP');
  await stopFactoryContainers(factory);
  await unsubscribeFromFactory(factory.factoryId);
  factory.status = 'inactive';
  upsertFactory(factory);
  await publishState(factory);
}

async function handleStatusChange(
  command: FactoryCommand,
  status: 'active' | 'inactive' | 'maintenance'
): Promise<void> {
  const factory = getFactory(command.factoryId);
  if (!factory) {
    console.warn(`Factory not found: ${command.factoryId}`);
    return;
  }
  factory.status = status;
  upsertFactory(factory);
  await publishState(factory);
}

async function handleReset(command: FactoryCommand): Promise<void> {
  const factory = getFactory(command.factoryId);
  if (!factory) {
    console.warn(`Factory not found: ${command.factoryId}`);
    return;
  }
  factory.status = 'inactive';
  factory.workers = [];
  factory.outputLevel = 1;
  upsertFactory(factory);
  await publishState(factory);
  await stopFactoryContainers(factory);
  await unsubscribeFromFactory(factory.factoryId);
}

async function handleAssignWorker(command: FactoryCommand): Promise<void> {
  const factory = getFactory(command.factoryId);
  if (!factory) {
    console.warn(`Factory not found: ${command.factoryId}`);
    return;
  }
  const { workerId, name, type } = command.payload as {
    workerId: string;
    name: string;
    type: 'human' | 'robot';
  };
  const alreadyAssigned = factory.workers.some(w => w.workerId === workerId);
  if (!alreadyAssigned) {
    factory.workers.push({ workerId, name, type });
  }
  upsertFactory(factory);
  await publishState(factory);
  await startWorkerContainer(factory.factoryId, workerId, type);
  await publishOperation(factory.factoryId, 'WORKER_ASSIGN', { workerId, workerType: type });
}

async function handleUnassignWorker(command: FactoryCommand): Promise<void> {
  const factory = getFactory(command.factoryId);
  if (!factory) {
    console.warn(`Factory not found: ${command.factoryId}`);
    return;
  }
  const { workerId } = command.payload as { workerId: string };
  factory.workers = factory.workers.filter(w => w.workerId !== workerId);
  upsertFactory(factory);
  await publishState(factory);
  await stopWorkerContainer(factory.factoryId, workerId);
  await publishOperation(factory.factoryId, 'WORKER_UNASSIGN', { workerId });
}

async function handleOutputChange(command: FactoryCommand, delta: number): Promise<void> {
  const factory = getFactory(command.factoryId);
  if (!factory) {
    console.warn(`Factory not found: ${command.factoryId}`);
    return;
  }
  factory.outputLevel = Math.max(1, factory.outputLevel + delta);
  upsertFactory(factory);
  await publishState(factory);
}
