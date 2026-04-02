export type FactoryStatus = 'active' | 'inactive' | 'maintenance';
export type ConveyorStatus = 'active' | 'inactive' | 'maintenance';

export interface ConveyorState {
  conveyorId: string;
  name: string;
  status: ConveyorStatus;
  capacity: number;
}

export interface WorkerAssignment {
  workerId: string;
  name: string;
  type: 'human' | 'robot';
}

export interface FactoryStateSnapshot {
  factoryId: string;
  name: string;
  status: FactoryStatus;
  location: string;
  totalCapacity: number;
  conveyors: ConveyorState[];
  workers: WorkerAssignment[];
  outputLevel: number;
  lastUpdated: string;
}

// In-memory store keyed by factoryId
const store = new Map<string, FactoryStateSnapshot>();

export const getFactory = (factoryId: string): FactoryStateSnapshot | undefined =>
  store.get(factoryId);

export const getAllFactories = (): FactoryStateSnapshot[] =>
  Array.from(store.values());

export const upsertFactory = (snapshot: FactoryStateSnapshot): void => {
  snapshot.lastUpdated = new Date().toISOString();
  store.set(snapshot.factoryId, snapshot);
};

export const factoryExists = (factoryId: string): boolean =>
  store.has(factoryId);
